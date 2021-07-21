using System.Collections.Generic;
using System.Linq;

namespace CompetitionViewer.Services
{
    public interface IEventInfoProvider
    {
        IEnumerable<EDRAEventInfo> GetEventInfos();
    }

    public class EventInfoProvider : IEventInfoProvider
    {
        public IEnumerable<EDRAEventInfo> GetEventInfos()
        {
            return Enumerable
                .Range(20, 200)
                .Select(x => x.ToString())
                .Select((x, i) => new EDRAEventInfo(x, $"http://www.edra.ee/tulemused.php?eventID={x}", i))
                .ToArray();
        }
    }
}
