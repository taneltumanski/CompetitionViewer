using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CompetitionViewer.Services
{
    public interface ILiveRaceResultsService
    {
        IObservable<RaceData> Stream { get; }
    }

    public class LiveRaceResultsService : ILiveRaceResultsService, IDisposable
    {
        private readonly CancellationTokenSource _cts = new CancellationTokenSource();

        private readonly IEventInfoProvider _eventUriProvider;
        private readonly ILogger<LiveRaceResultsService> _logger;
        private readonly EDRAResultService _resultService;

        public IObservable<RaceData> Stream { get; }

        public LiveRaceResultsService(EDRAResultService resultService, IEventInfoProvider eventUriProvider, ILogger<LiveRaceResultsService> logger)
        {
            _resultService = resultService;
            _eventUriProvider = eventUriProvider;
            _logger = logger;

            Stream = Observable
                .Defer(CreateObservable)
                .Publish()
                .RefCount();
        }

        private IObservable<RaceData> CreateObservable()
        {
            return Observable.Create<RaceData>(observer =>
            {
                var cts = new CancellationTokenSource();
                var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, _cts.Token);

                var thread = new Thread(async () =>
                {
                    try
                    {
                        await PollResults(linkedCts.Token, observer);

                        observer.OnCompleted();
                    }
                    catch (Exception e)
                    {
                        observer.OnError(e);
                    }
                });

                thread.Name = "ResultsPollThread";
                thread.IsBackground = true;
                thread.Start();

                return Disposable.Create(() =>
                {
                    cts.Cancel();

                    thread.Join();

                    cts.Dispose();
                    linkedCts.Dispose();
                });
            });
        }

        private async Task PollResults(CancellationToken ct, IObserver<RaceData> observer)
        {
            while (!ct.IsCancellationRequested)
            {
                var eventInfos = _eventUriProvider.GetEventInfos().ToArray();

                foreach (var info in eventInfos)
                {
                    try
                    {
                        var results = await _resultService.GetRaceData(info, ct);

                        foreach (var result in results)
                        {
                            observer.OnNext(result);
                        }
                    }
                    catch (Exception e)
                    {
                        _logger.LogError(e, "Could not get event info: {eventId} {url}", info.Id, info.FullUri);
                    }
                }

                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), ct);
                }
                catch (OperationCanceledException) { }
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _cts.Dispose();
        }
    }
}
