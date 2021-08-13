using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Concurrency;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Threading;
using System.Threading.Tasks;
using CompetitionViewer.Services.ResultsRequesters.EDRA;
using Microsoft.Extensions.Logging;
using MoreLinq;

namespace CompetitionViewer.Services
{
    public class RaceUpdateService : IRaceUpdateService
    {
        private readonly IEventInfoProvider _eventInfoProvider;
        private readonly EDRAResultService _resultService;
        private readonly IRaceService _raceService;
        private readonly IScheduler _scheduler;
        private readonly ILogger<RaceUpdateService> _logger;
        private readonly DisposableDictionary _schedulerDisposables = new();

        private bool _isRunning;
        private Task _startTask = Task.CompletedTask;
        private readonly HashSet<string> _writtenLogsForHashcodes = new();

        public RaceUpdateService(IEventInfoProvider eventInfoProvider, EDRAResultService resultService, IRaceService raceService, IScheduler scheduler, ILogger<RaceUpdateService> logger)
        {
            _eventInfoProvider = eventInfoProvider;
            _resultService = resultService;
            _raceService = raceService;
            _scheduler = scheduler;
            _logger = logger;
        }

        public Task Start()
        {
            if (_isRunning)
            {
                return _startTask;
            }

            _logger.LogInformation("Starting update service");
            _isRunning = true;
            _startTask = UpdateAllEvents(true);

            return _startTask;
        }

        public void Stop()
        {
            _logger.LogInformation("Stopping update service");

            _isRunning = false;
            _schedulerDisposables.RemoveAll();
            _raceService.Clear();
        }

        public async Task Update(string eventId)
        {
            var eventInfo = _eventInfoProvider
                .GetEventInfos()
                .SingleOrDefault(x => x.Id == eventId);

            if (eventInfo != null)
            {
                await PollEvent(eventInfo);
            }
        }

        public Task UpdateAll()
        {
            return UpdateAllEvents(true);
        }

        private async Task UpdateAllEvents(bool isForced)
        {
            var eventInfos = _eventInfoProvider
                .GetEventInfos()
                .Reverse();

            if (isForced)
            {
                var updateTasks = eventInfos
                    .Select(x => Task.Run(() => PollEvent(x)))
                    .ToArray();

                await Task.WhenAll(updateTasks);
            }
            else
            {
                foreach (var evtInfo in eventInfos)
                {
                    ScheduleUpdateEvent(evtInfo);
                }
            }
        }

        private void ScheduleUpdateEvent(EDRAEventInfo evtInfo)
        {
            var latestDataItem = _raceService
                .GetEventData(evtInfo.Id)
                .OrderByDescending(x => x.Timestamp)
                .FirstOrDefault();

            var actionDelay = GetDelayTime(latestDataItem);
            var action = _scheduler.ScheduleAsync(actionDelay, async (_, __) =>
            {
                await PollEvent(evtInfo);

                if (_isRunning)
                {
                    ScheduleUpdateEvent(evtInfo);
                }
            });

            _schedulerDisposables.AddOrUpdate(evtInfo.Id, action);
        }

        private async Task PollEvent(EDRAEventInfo evtInfo)
        {
            try
            {
                var data = await _resultService.GetRaceData(evtInfo, CancellationToken.None);
                var mappedData = data
                    .Pipe(x =>
                    {
                        if (x.Errors.Any() && _writtenLogsForHashcodes.Add(x.Hashcode))
                        {
                            _logger.LogError("Data errors: [ {message} ]", string.Join(", ", x.Errors));
                        }
                    })
                    .Where(x => !x.Errors.Any())
                    .Select(x => Map(evtInfo.Id, x));

                _raceService.AddOrUpdate(evtInfo.Id, mappedData);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Polling event {eventUri} failed", evtInfo.FullUri);
            }
        }

        private static RaceDataDto Map(string eventId, EDRADragParser.ParseResult result)
        {
            return new RaceDataDto()
            {
                Hashcode = result.Hashcode,
                EventId = eventId,
                RaceId = result.RaceData.RaceId,
                Timestamp = result.RaceData.Timestamp,
                Round = result.RaceData.Round,
                DialIn = result.RaceData.DialIn,
                FinishSpeed = result.RaceData.FinishSpeed,
                FinishTime = result.RaceData.FinishTime,
                Lane = result.RaceData.Lane,
                RacerId = result.RaceData.RacerId,
                ReactionTime = result.RaceData.ReactionTime,
                Result = result.RaceData.Result == RaceResult.Winner ? 0 : result.RaceData.Result == RaceResult.RunnerUp ? 1 : (int?)null,
                SixSixtyFeetSpeed = result.RaceData.SixSixtyFeetSpeed,
                SixSixtyFeetTime = result.RaceData.SixSixtyFeetTime,
                SixtyFeetTime = result.RaceData.SixtyFeetTime,
                ThousandFeetSpeed = result.RaceData.ThousandFeetSpeed,
                ThousandFeetTime = result.RaceData.ThousandFeetTime,
                ThreeThirtyFeetTime = result.RaceData.ThreeThirtyFeetTime
            };
        }

        private TimeSpan GetDelayTime(RaceDataDto item)
        {
            var timestamp = item?.Timestamp;
            if (timestamp != null)
            {
                var difference = _scheduler.Now - timestamp;
                if (difference < TimeSpan.FromHours(48))
                {
                    return TimeSpan.FromSeconds(3);
                }
                else if (difference < TimeSpan.FromDays(14))
                {
                    return TimeSpan.FromHours(1);
                }
                else
                {
                    return TimeSpan.FromDays(14);
                }
            }

            return TimeSpan.FromHours(1);
        }

        private class DisposableDictionary : IDisposable
        {
            public readonly ConcurrentDictionary<string, SerialDisposable> _disposables = new();

            public void AddOrUpdate(string id, IDisposable disposable)
            {
                _disposables.AddOrUpdate(id, _ => new SerialDisposable { Disposable = disposable },
                    (_, old) =>
                    {
                        old.Disposable = disposable;
                        return old;
                    });
            }

            public void Remove(string id)
            {
                if (_disposables.TryRemove(id, out var disposable))
                {
                    disposable.Dispose();
                }
            }

            public void RemoveAll()
            {
                foreach (var item in _disposables)
                {
                    if (_disposables.TryRemove(item.Key, out var disposable))
                    {
                        disposable.Dispose();
                    }
                }
            }

            public void Dispose()
            {
                foreach (var item in _disposables)
                {
                    if (_disposables.TryRemove(item.Key, out var disposable))
                    {
                        disposable.Dispose();
                    }
                }
            }
        }
    }
}
