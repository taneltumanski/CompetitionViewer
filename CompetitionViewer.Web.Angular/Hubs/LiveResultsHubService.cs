using CompetitionViewer.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Disposables;
using System.Threading.Tasks;

namespace CompetitionViewer.Web.Angular.Hubs
{
    public class LiveResultsHubService
    {
        private readonly IHubContext<LiveResultsHub, IClientInterface> _hubContext;
        private readonly ILiveRaceResultsService _resultsService;

        private readonly ConcurrentDictionary<string, IDisposable> _subscriptions = new ConcurrentDictionary<string, IDisposable>();

        public LiveResultsHubService(IHubContext<LiveResultsHub, IClientInterface> hubContext, ILiveRaceResultsService resultsService)
        {
            _hubContext = hubContext;
            _resultsService = resultsService;
        }

        public void Subscribe(HubCallerContext context)
        {
            var disposable = new SingleAssignmentDisposable();

            if (_subscriptions.TryAdd(context.ConnectionId, disposable))
            {
                var abortDisposable = context.ConnectionAborted.Register(() => Unsubscribe(context));
                var subscriptionDisposable = _resultsService
                    .Stream
                    .Subscribe(x => _hubContext.Clients.Client(context.ConnectionId).DataReceived(x));

                disposable.Disposable = new CompositeDisposable(abortDisposable, subscriptionDisposable);
            }
        }

        public void Unsubscribe(HubCallerContext context)
        {
            if (_subscriptions.TryRemove(context.ConnectionId, out var disposable))
            {
                disposable.Dispose();
            }
        }
    }
}
