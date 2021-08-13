using System;
using System.Collections.Generic;

namespace CompetitionViewer.Services
{
    public interface IRaceService
    {
        IObservable<RaceDataEvent> GetDataEventStream();

        IEnumerable<EventDataDto> GetEvents();
        IEnumerable<RaceDataDto> GetEventData(string eventId);
        IEnumerable<RaceDataDto> GetAllEventData();
        IEnumerable<RaceDataDto> GetLatestEventData();

        void Clear();
        bool AddOrUpdate(string eventId, IEnumerable<RaceDataDto> data);
    }
}
