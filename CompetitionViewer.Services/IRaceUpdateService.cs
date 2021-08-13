using System.Threading.Tasks;

namespace CompetitionViewer.Services
{
    public interface IRaceUpdateService
    {
        Task Start();
        void Stop();
        Task Update(string eventId);
        Task UpdateAll();
    }
}
