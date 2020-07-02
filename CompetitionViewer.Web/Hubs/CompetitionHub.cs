using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CompetitionViewer.Web.Hubs
{
    public class CompetitionHub : Hub<ICompetitionClient>
    {
        private readonly ILogger<CompetitionHub> _logger;
        private readonly MessagingListener _listener;

        public CompetitionHub(ILogger<CompetitionHub> logger, MessagingListener listener)
        {
            _logger = logger;
            _listener = listener;
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
    }
}
