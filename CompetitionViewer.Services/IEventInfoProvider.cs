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
                .Range(85, 1)
                .Select(x => x.ToString())
                .Select(x => new EDRAEventInfo(x, $"http://www.edra.ee/tulemused.php?eventID={x}"))
                .ToArray();
        }
    }
}
