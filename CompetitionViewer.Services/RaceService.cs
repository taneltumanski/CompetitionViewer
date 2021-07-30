using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reactive.Concurrency;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CompetitionViewer.Services.ResultsRequesters.EDRA;
using Microsoft.Extensions.Logging;
using MoreLinq;

namespace CompetitionViewer.Services
{
    public interface IRaceService
    {
        IObservable<RaceDataEvent> GetDataEventStream();

        IEnumerable<EventDataDto> GetEvents();
        IEnumerable<RaceDataDto> GetEventData(string eventId);
        IEnumerable<RaceDataDto> GetAllEventData();

        void Clear();
        void AddOrUpdate(string eventId, IEnumerable<RaceDataDto> data);
    }

    public class RaceDataEvent
    {
        public RaceDataEvent(RaceDataEventType type, string id, RaceDataDto data)
        {
            Type = type;
            Id = id ?? throw new ArgumentNullException(nameof(id));
            Data = data ?? throw new ArgumentNullException(nameof(data));
        }

        public RaceDataEvent(RaceDataEventType type, string id)
        {
            Type = type;
            Id = id ?? throw new ArgumentNullException(nameof(id));
        }

        public RaceDataEventType Type { get; }
        public string Id { get; }
        public RaceDataDto Data { get; }

    }

    public enum RaceDataEventType
    {
        Invalid = 0,
        Delete = 1,
        AddOrUpdate = 2
    }

    public interface IRaceUpdateService
    {
        Task Start();
        void Stop();
        Task Update(string eventId);
        Task UpdateAll();
    }

    public class RaceUpdateService : IRaceUpdateService
    {
        private readonly IEventInfoProvider _eventInfoProvider;
        private readonly EDRAResultService _resultService;
        private readonly IRaceService _raceService;
        private readonly IScheduler _scheduler;
        private readonly ILogger<RaceUpdateService> _logger;
        private readonly DisposableDictionary _schedulerDisposables = new();

        private bool _isRunning;
        private readonly HashSet<string> _writtenLogsForHashcodes = new HashSet<string>();

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
                return Task.CompletedTask;
            }

            _logger.LogInformation("Starting update service");

            _isRunning = true;

            return UpdateAllEvents(true);
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
            var eventInfos = _eventInfoProvider.GetEventInfos();

            foreach (var evtInfo in eventInfos)
            {
                if (isForced)
                {
                    await PollEvent(evtInfo);
                }
                else
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

    public class RaceService : IRaceService, IDisposable
    {
        private readonly ConcurrentDictionary<string, (EventDataDto evt, ConcurrentDictionary<string, RaceDataDto> items)> _raceItems = new();
        private readonly Subject<RaceDataEvent> _raceDataEventSubject = new();
        private readonly ILogger<RaceService> _logger;

        public RaceService(ILogger<RaceService> logger)
        {
            _logger = logger;
        }

        public IObservable<RaceDataEvent> GetDataEventStream()
        {
            return _raceDataEventSubject.AsObservable();
        }

        public IEnumerable<RaceDataDto> GetAllEventData()
        {
            return _raceItems
                .SelectMany(x => x.Value.items)
                .Select(x => x.Value);
        }

        public IEnumerable<EventDataDto> GetEvents()
        {
            return _raceItems.Values.Select(x => x.evt);
        }

        public IEnumerable<RaceDataDto> GetEventData(string eventId)
        {
            if (_raceItems.TryGetValue(eventId, out var eventData))
            {
                return eventData.items.Values.ToImmutableArray();
            }

            return Enumerable.Empty<RaceDataDto>();
        }

        public void Clear()
        {
            _raceItems.Clear();
        }

        public void AddOrUpdate(string eventId, IEnumerable<RaceDataDto> data)
        {
            var newItems = data
                .GroupBy(x => x.Hashcode)
                .Select(x => x.First())
                .ToDictionary(x => x.Hashcode, x => x);

            if (!newItems.Any())
            {
                return;
            }

            var eventData = _raceItems.GetOrAdd(eventId, _ =>
            {
                _logger.LogInformation("Adding event {eventId}", eventId);
                return (new EventDataDto() { Id = eventId }, new ConcurrentDictionary<string, RaceDataDto>());
            });

            var eventItems = eventData.items;
            var existingKeys = Enumerable.ToHashSet(eventItems.Select(x => x.Key));

            foreach (var item in newItems)
            {
                var isAddOrUpdate = false;

                eventItems.AddOrUpdate(item.Key,
                    _ =>
                    {
                        isAddOrUpdate = true;
                        return item.Value;
                    },
                    (_, old) =>
                    {
                        if (old.Hashcode == item.Value.Hashcode)
                        {
                            return old;
                        }

                        isAddOrUpdate = true;
                        return item.Value;
                    });

                if (isAddOrUpdate)
                {
                    OnAddOrUpdate(item.Key, item.Value);
                }
            }

            var missingKeys = existingKeys.Where(x => !newItems.ContainsKey(x));

            foreach (var missingKey in missingKeys)
            {
                if (eventItems.TryRemove(missingKey, out var item))
                {
                    OnDelete(missingKey);
                }
            }
        }

        private void OnAddOrUpdate(string id, RaceDataDto data)
        {
            try
            {
                _raceDataEventSubject.OnNext(new RaceDataEvent(RaceDataEventType.AddOrUpdate, id, data));
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Event error");
            }
        }

        private void OnDelete(string id)
        {
            try
            {
                _raceDataEventSubject.OnNext(new RaceDataEvent(RaceDataEventType.Delete, id));
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Event error");
            }
        }

        public void Dispose()
        {
            _raceDataEventSubject.OnCompleted();
            _raceDataEventSubject.Dispose();
        }
    }
}
