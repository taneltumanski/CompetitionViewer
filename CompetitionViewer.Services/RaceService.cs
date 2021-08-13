using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Text;
using Microsoft.Extensions.Logging;
using MoreLinq;

namespace CompetitionViewer.Services
{
    public class RaceService : IRaceService, IDisposable
    {
        private readonly ConcurrentDictionary<string, EventModel> _raceItems = new();
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
                .SelectMany(x => x.Value.Items)
                .Select(x => x.Value);
        }

        public IEnumerable<RaceDataDto> GetLatestEventData()
        {
            return _raceItems
                .OrderByDescending(x => x.Value.StartTimestamp)
                .FirstOrDefault().Value?.Items.Values ?? Enumerable.Empty<RaceDataDto>();
        }

        public IEnumerable<EventDataDto> GetEvents()
        {
            return _raceItems.Values.Select(x => x.Event);
        }

        public IEnumerable<RaceDataDto> GetEventData(string eventId)
        {
            if (_raceItems.TryGetValue(eventId, out var eventData))
            {
                return eventData.Items.Values.ToImmutableArray();
            }

            return Enumerable.Empty<RaceDataDto>();
        }

        public void Clear()
        {
            _raceItems.Clear();
        }

        public bool AddOrUpdate(string eventId, IEnumerable<RaceDataDto> data)
        {
            var newItems = data
                .GroupBy(x => x.Hashcode)
                .Select(x => x.First())
                .ToDictionary(x => x.Hashcode, x => x);

            if (!newItems.Any())
            {
                return false;
            }

            var eventData = _raceItems.GetOrAdd(eventId, _ =>
            {
                _logger.LogInformation("Adding event {eventId}", eventId);
                return new EventModel(new EventDataDto() { Id = eventId }, new ConcurrentDictionary<string, RaceDataDto>());
            });

            foreach (var item in newItems)
            {
                if (eventData.StartTimestamp == null || item.Value.Timestamp < eventData.StartTimestamp)
                {
                    eventData.StartTimestamp = item.Value.Timestamp;
                }
            }

            var eventItems = eventData.Items;
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

            return true;
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
