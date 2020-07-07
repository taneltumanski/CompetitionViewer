using Functional;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace CompetitionViewer.Services
{
    public interface ILiveRaceResultsService
    {
        IObservable<RaceDataDto> GetStream();
    }

    public class LiveRaceResultsService : ILiveRaceResultsService, IDisposable
    {
        private readonly CancellationTokenSource _cts = new CancellationTokenSource();

        private readonly IEventInfoProvider _eventUriProvider;
        private readonly ILogger<LiveRaceResultsService> _logger;
        private readonly IConnectableObservable<RaceDataDto> _stream;
        private readonly IDisposable _disposable;
        private readonly EDRAResultService _resultService;

        public LiveRaceResultsService(EDRAResultService resultService, IEventInfoProvider eventUriProvider, ILogger<LiveRaceResultsService> logger)
        {
            _resultService = resultService;
            _eventUriProvider = eventUriProvider;
            _logger = logger;

            _stream = CreateObservable()
                .Distinct(x => HashCode.Combine(x.RaceId, x.EventId, x.Timestamp))
                .Replay();

            _disposable = _stream.Connect();
        }

        public IObservable<RaceDataDto> GetStream()
        {
            return _stream;
        }

        private IObservable<RaceDataDto> CreateObservable()
        {
            return Observable.Create<RaceDataDto>(observer =>
            {
                _logger.LogInformation("Polling results started");

                var cts = new CancellationTokenSource();
                var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, _cts.Token);

#pragma warning disable IDE0017 // Simplify object initialization
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
#pragma warning restore IDE0017 // Simplify object initialization

                thread.Name = "ResultsPollThread";
                thread.IsBackground = true;
                thread.Start();

                return Disposable.Create(() =>
                {
                    _logger.LogInformation("Polling results stopping");

                    cts.Cancel();

                    thread.Join();

                    cts.Dispose();
                    linkedCts.Dispose();

                    _logger.LogInformation("Polling results stopped");
                });
            });
        }

        private async Task PollResults(CancellationToken ct, IObserver<RaceDataDto> observer)
        {
            var sentHashcodes = new HashSet<string>();

            while (!ct.IsCancellationRequested)
            {
                var eventInfos = _eventUriProvider
                    .GetEventInfos()
                    .ToArray();

                foreach (var info in eventInfos)
                {
                    try
                    {
                        var results = (await _resultService.GetRaceData(info, ct))
                            .Where(x => sentHashcodes.Add(x.Hashcode))
                            .Do(x =>
                            {
                                foreach (var error in x.Errors)
                                {
                                    _logger.LogError("Failed to parse: {message}", error);
                                }
                            });

                        var mappedResults = Map(results);

                        foreach (var result in mappedResults)
                        {
                            observer.OnNext(result);
                        }
                    }
                    catch (OperationCanceledException) { }
                    catch (Exception e)
                    {
                        _logger.LogError(e, "Could not get event info: {eventId} {url}", info.Id, info.FullUri);
                    }
                }

                try
                {
                    await Task.Delay(TimeSpan.FromHours(1), ct);
                }
                catch (OperationCanceledException) { }
            }
        }

        private IEnumerable<RaceDataDto> Map(IEnumerable<EDRADragParser.ParseResult> results)
        {
            var grouping = results
                .Select(x => x.RaceData)
                .GroupBy(x => (x.EventId, x.RaceId, x.Timestamp, x.Round));

            foreach (var item in grouping)
            {
                var itemResults = item
                    .Select(x => new RaceResultDto()
                    {
                        DialIn = x.DialIn,
                        FinishSpeed = x.FinishSpeed,
                        FinishTime = x.FinishTime,
                        Lane = x.Lane,
                        RacerId = x.RacerId,
                        ReactionTime = x.ReactionTime,
                        Result = x.Result == RaceResult.Winner ? 0 : x.Result == RaceResult.RunnerUp ? 1 : (int?)null,
                        SixSixtyFeetSpeed = x.SixSixtyFeetSpeed,
                        SixSixtyFeetTime = x.SixSixtyFeetTime,
                        SixtyFeetTime = x.SixtyFeetTime,
                        ThousandFeetSpeed = x.ThousandFeetSpeed,
                        ThousandFeetTime = x.ThousandFeetTime,
                        ThreeThirtyFeetTime = x.ThreeThirtyFeetTime
                    })
                    .ToImmutableArray();

                yield return new RaceDataDto()
                {
                    EventId = item.Key.EventId,
                    RaceId = item.Key.RaceId,
                    Timestamp = item.Key.Timestamp,
                    Round = item.Key.Round,
                    Results = itemResults
                };
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _cts.Dispose();
            _disposable.Dispose();
        }
    }
}
