using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reactive;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using CompetitionViewer.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CompetitionViewer.Web.Hubs
{
    public class MessagingListener : IDisposable
    {
        private readonly IHubClients<ICompetitionClient> _clients;
        private readonly ILiveRaceResultsService _liveRaceResultsService;
        private readonly ILogger<MessagingListener> _logger;

        private ConcurrentDictionary<string, IDisposable> _subscribers = new ConcurrentDictionary<string, IDisposable>();

        private readonly object _lock = new object();

        private bool _isDisposed = false;

        public MessagingListener(IHubContext<CompetitionHub, ICompetitionClient> hubContext, ILiveRaceResultsService liveRaceResultsService, ILogger<MessagingListener> logger)
        {
            _clients = hubContext.Clients;
            _liveRaceResultsService = liveRaceResultsService;
            _logger = logger;
        }

        public void Subscribe(string id)
        {
            lock (_lock)
            {
                if (_isDisposed)
                {
                    throw new ObjectDisposedException(nameof(MessagingListener));
                }

                if (_subscribers.ContainsKey(id))
                {
                    Unsubscribe(id);
                }

                var observer = Observer
                    .Create<IEnumerable<RaceEventMessage>>(
                        async msgs => await _clients.Client(id).SendMessages(msgs),
                        ex => _logger.LogError(ex, "Logger error for client {connectionId}", id));

                var subscription = _liveRaceResultsService
                    .GetStream()
                    .Where(x => x.EventId != null && x.RaceId != null && x.Timestamp.HasValue)
                    .Select(data => new RaceEventMessage()
                    {
                        EventId = data.EventId,
                        RaceId = data.RaceId,
                        Round = data.Round,
                        Timestamp = data.Timestamp.Value.ToUnixTimeMilliseconds(),
                        Results = data
                            .Results
                            .Select(x => new RaceEventResult()
                            {
                                DialIn = x.DialIn?.TotalSeconds,
                                FinishSpeed = x.FinishSpeed,
                                FinishTime = x.FinishTime?.TotalSeconds,
                                Lane = x.Lane,
                                RacerId = x.RacerId,
                                ReactionTime = x.ReactionTime?.TotalSeconds,
                                Result = x.Result,
                                SixSixtyFeetSpeed = x.SixSixtyFeetSpeed,
                                SixSixtyFeetTime = x.SixSixtyFeetTime?.TotalSeconds,
                                SixtyFeetTime = x.SixtyFeetTime?.TotalSeconds,
                                ThousandFeetSpeed = x.ThousandFeetSpeed,
                                ThousandFeetTime = x.ThousandFeetTime?.TotalSeconds,
                                ThreeThirtyFeetTime = x.ThreeThirtyFeetTime?.TotalSeconds,
                            })
                            .ToList()
                    })
                    .Buffer(TimeSpan.FromSeconds(1))
                    .Where(x => x.Any())
                    .Subscribe(observer);

                var disposable = Disposable.Create(() =>
                {
                    subscription.Dispose();
                });

                _subscribers.TryAdd(id, disposable);
            }
        }

        public void Unsubscribe(string id)
        {
            if (_subscribers.TryRemove(id, out var subscription))
            {
                subscription.Dispose();
            }
        }

        public void Dispose()
        {
            lock (_lock)
            {
                GC.SuppressFinalize(this);

                _isDisposed = true;

                foreach (var subscriber in _subscribers)
                {
                    subscriber.Value.Dispose();

                    _subscribers.Remove(subscriber.Key, out var _);
                }
            }
        }
    }
}