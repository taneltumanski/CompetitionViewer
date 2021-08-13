using System;
using System.Collections.Concurrent;

namespace CompetitionViewer.Services
{
    internal class EventModel
    {
        public EventModel(EventDataDto evt, ConcurrentDictionary<string, RaceDataDto> items)
        {
            Event = evt;
            Items = items;
        }

        public EventDataDto Event { get; }
        public DateTimeOffset? StartTimestamp { get; set; }
        public ConcurrentDictionary<string, RaceDataDto> Items { get; } = new ConcurrentDictionary<string, RaceDataDto>();
    }
}
