using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CompetitionViewer.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CompetitionViewer.Web.Hubs
{
    public class CompetitionHub : Hub<ICompetitionClient>
    {
        private readonly ILogger<CompetitionHub> _logger;
        private readonly MessagingListener _listener;
        private readonly IRaceUpdateService _raceUpdateService;

        public CompetitionHub(ILogger<CompetitionHub> logger, MessagingListener listener, IRaceUpdateService raceUpdateService)
        {
            _logger = logger;
            _listener = listener;
            _raceUpdateService = raceUpdateService;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("Client connected: connection id = \"{connectionId}\", name = \"{username}\"", Context.ConnectionId, Context.UserIdentifier);

            _listener.Subscribe(Context.ConnectionId);

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            if (exception != null)
            {
                _logger.LogError(exception, "Client disconnected: connection id = \"{connectionId}\", name = \"{username}\"", Context.ConnectionId, Context.UserIdentifier);
            }
            else
            {
                _logger.LogInformation("Client disconnected: connection id = \"{connectionId}\", name = \"{username}\"", Context.ConnectionId, Context.UserIdentifier);
            }

            _listener.Unsubscribe(Context.ConnectionId);

            await base.OnDisconnectedAsync(exception);
        }

        public Task UpdateEvent(string id)
        {
            _logger.LogInformation("Requested update event {eventId}", id);
            _raceUpdateService.Update(id);

            return Task.CompletedTask;
        }

        public Task UpdateAllEvents()
        {
            _logger.LogInformation("Requested update all events");
            _raceUpdateService.UpdateAll();

            return Task.CompletedTask;
        }
    }
}
