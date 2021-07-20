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
        private readonly IRaceUpdateService _updateService;
        private readonly IRaceService _liveRaceResultsService;
        private readonly ILogger<MessagingListener> _logger;

        private readonly ConcurrentDictionary<string, IDisposable> _subscribers = new ConcurrentDictionary<string, IDisposable>();

        private readonly object _lock = new object();

        private bool _isDisposed = false;

        public MessagingListener(IHubContext<CompetitionHub, ICompetitionClient> hubContext, IRaceUpdateService updateService, IRaceService raceService, ILogger<MessagingListener> logger)
        {
            _clients = hubContext.Clients;
            _updateService = updateService;
            _liveRaceResultsService = raceService;
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
                    .Create<CompetitionMessage>(
                        async msg => await _clients.Client(id).OnCompetitionMessage(msg),
                        ex => _logger.LogError(ex, "Logger error for client {connectionId}", id));

                var subscription = _liveRaceResultsService
                    .GetDataEventStream()
                    .Where(x => x.Type == RaceDataEventType.AddOrUpdate)
                    .Select(x => x.Data)
                    .Where(x => x.EventId != null && x.RaceId != null && x.Timestamp.HasValue)
                    .Select(data => new RaceEventMessage()
                    {
                        EventId = data.EventId,
                        RaceId = data.RaceId,
                        Round = data.Round,
                        Timestamp = data.Timestamp.Value.ToUnixTimeMilliseconds(),
                        DialIn = data.DialIn?.TotalSeconds,
                        FinishSpeed = data.FinishSpeed,
                        FinishTime = data.FinishTime?.TotalSeconds,
                        Lane = data.Lane,
                        RacerId = data.RacerId,
                        ReactionTime = data.ReactionTime?.TotalSeconds,
                        Result = data.Result,
                        SixSixtyFeetSpeed = data.SixSixtyFeetSpeed,
                        SixSixtyFeetTime = data.SixSixtyFeetTime?.TotalSeconds,
                        SixtyFeetTime = data.SixtyFeetTime?.TotalSeconds,
                        ThousandFeetSpeed = data.ThousandFeetSpeed,
                        ThousandFeetTime = data.ThousandFeetTime?.TotalSeconds,
                        ThreeThirtyFeetTime = data.ThreeThirtyFeetTime?.TotalSeconds
                    })
                    .Buffer(TimeSpan.FromSeconds(1))
                    .Where(x => x.Any())
                    .Select((x, i) => new CompetitionMessage()
                    {
                        MessageIndex = i,
                        Messages = x
                    })
                    .Subscribe(observer);

                var disposable = Disposable.Create(() =>
                {
                    subscription.Dispose();
                });

                _subscribers.TryAdd(id, disposable);

                if (_subscribers.Any())
                {
                    _updateService.Start();
                }
            }
        }

        public void Unsubscribe(string id)
        {
            if (_subscribers.TryRemove(id, out var subscription))
            {
                subscription.Dispose();
            }

            if (!_subscribers.Any())
            {
                _updateService.Stop();
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