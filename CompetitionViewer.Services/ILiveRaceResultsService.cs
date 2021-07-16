using System;

namespace CompetitionViewer.Services
{
    public interface ILiveRaceResultsService
    {
        IObservable<RaceDataDto> GetStream();
    }
}
