using System.Collections.Generic;
using System.Linq;

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
            return Enumerable
                .Range(64, 10)
                .Select(x => x.ToString())
                .Select(x => new EventInfo(x, $"http://www.edra.ee/tulemused.php?eventID={x}"))
                .ToArray();
        }
    }
}
