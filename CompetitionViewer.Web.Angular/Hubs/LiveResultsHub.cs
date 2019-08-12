using CompetitionViewer.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CompetitionViewer.Web.Angular.Hubs
{
    public class LiveResultsHub : Hub<IClientInterface>, IServerInterface
    {
        private readonly LiveResultsHubService _resultsHubService;

        public LiveResultsHub(LiveResultsHubService liveResultsHubService)
        {
            _resultsHubService = liveResultsHubService;
        }

        public override Task OnConnectedAsync()
        {
            _resultsHubService.Subscribe(Context);

            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            _resultsHubService.Unsubscribe(Context);

            return base.OnDisconnectedAsync(exception);
        }
    }

    public interface IServerInterface
    {
        
    }

    public interface IClientInterface
    {
        void DataReceived(RaceData data);
    }
}
