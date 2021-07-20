﻿using System;
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
        IEnumerable<RaceDataDto> GetEventData(string eventId);
        ImmutableDictionary<string, IEnumerable<RaceDataDto>> GetEventData();

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
        void Start();
        void Stop();
        void Update(string eventId);
        void UpdateAll();
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

        public RaceUpdateService(IEventInfoProvider eventInfoProvider, EDRAResultService resultService, IRaceService raceService, IScheduler scheduler, ILogger<RaceUpdateService> logger)
        {
            _eventInfoProvider = eventInfoProvider;
            _resultService = resultService;
            _raceService = raceService;
            _scheduler = scheduler;
            _logger = logger;
        }

        public void Start()
        {
            if (_isRunning)
            {
                return;
            }

            _logger.LogInformation("Starting update service");

            _isRunning = true;

            UpdateAllEvents(true);
        }

        public void Stop()
        {
            _logger.LogInformation("Stopping update service");

            _isRunning = false;
            _schedulerDisposables.RemoveAll();
        }

        public void Update(string eventId)
        {
            var eventInfo = _eventInfoProvider
                .GetEventInfos()
                .SingleOrDefault(x => x.Id == eventId);

            if (eventInfo != null)
            {
                UpdateEvent(eventInfo, true);
            }
        }

        public void UpdateAll()
        {
            UpdateAllEvents(true);
        }

        private void UpdateAllEvents(bool isForced)
        {
            var eventInfos = _eventInfoProvider.GetEventInfos();
            var latestEvent = _raceService
                .GetEventData()
                .Values
                .SelectMany(x => x.Select(y => (key: y.EventId, timestamp: y.Timestamp)))
                .Where(x => x.timestamp.HasValue)
                .MaxBy(x => x.timestamp.Value)
                .FirstOrDefault();

            foreach (var evtInfo in eventInfos)
            {
                UpdateEvent(evtInfo, isForced);
            }
        }

        private void UpdateEvent(EDRAEventInfo evtInfo, bool isForced)
        {
            var latestDataItem = _raceService
                .GetEventData(evtInfo.Id)
                .OrderByDescending(x => x.Timestamp)
                .FirstOrDefault();

            var actionDelay = isForced ? TimeSpan.Zero : GetDelayTime(latestDataItem);
            var action = _scheduler.ScheduleAsync(actionDelay, async (_, __) =>
            {
                try
                {
                    await PollEvent(evtInfo);
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Polling event {eventUri} failed", evtInfo.FullUri);
                }
            });

            _schedulerDisposables.AddOrUpdate(evtInfo.Id, action);
        }

        private async Task PollEvent(EDRAEventInfo evtInfo)
        {
            var data = await _resultService.GetRaceData(evtInfo, CancellationToken.None);
            var mappedData = data
                .Where(x => !x.Errors.Any())
                .Select(x => Map(evtInfo.Id, x));

            _raceService.AddOrUpdate(evtInfo.Id, mappedData);
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
            return TimeSpan.FromSeconds(5);
            var timestamp = item?.Timestamp;
            if (timestamp != null)
            {
                var difference = _scheduler.Now - timestamp;
                if (difference < TimeSpan.FromHours(48))
                {
                    return TimeSpan.FromSeconds(2);
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
        private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, RaceDataDto>> _raceItems = new();
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

        public ImmutableDictionary<string, IEnumerable<RaceDataDto>> GetEventData()
        {
            return _raceItems.ToImmutableDictionary(x => x.Key, x => x.Value.Select(y => y.Value));
        }

        public IEnumerable<RaceDataDto> GetEventData(string eventId)
        {
            if (_raceItems.TryGetValue(eventId, out var eventData))
            {
                return eventData.Values.ToImmutableArray();
            }

            return Enumerable.Empty<RaceDataDto>();
        }

        public void AddOrUpdate(string eventId, IEnumerable<RaceDataDto> data)
        {
            var eventItems = _raceItems.GetOrAdd(eventId, _ => new ConcurrentDictionary<string, RaceDataDto>());
            var existingKeys = Enumerable.ToHashSet(_raceItems.Select(x => x.Key));

            var temp = data.GroupBy(x => x.Hashcode).Select(x => x.ToArray()).Where(x => x.Length > 1).ToArray();
            var newItems = data.ToDictionary(x => x.Hashcode, x => x);

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
