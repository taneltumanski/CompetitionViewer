using System.Collections.Generic;
using System.Threading.Tasks;

namespace CompetitionViewer.Web.Hubs
{
    public interface ICompetitionClient
    {
        Task RaceMessages(IEnumerable<RaceEventMessage> msgs);
    }
}