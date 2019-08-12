using System.Collections.Generic;

namespace CompetitionViewer.Services
{
    public interface IEventInfoProvider
    {
        IEnumerable<EventInfo> GetEventInfos();
    }

    public class EventInfoProvider : IEventInfoProvider
    {
        public IEnumerable<EventInfo> GetEventInfos()
        {
            return new[]
            {
                new EventInfo("65", "http://www.edra.ee/tulemused.php?eventID=65")
            };
        }
    }
}
