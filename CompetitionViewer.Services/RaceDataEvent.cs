using System;

namespace CompetitionViewer.Services
{
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
}
