using System;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Linq;
using System.Reactive.Threading.Tasks;
using System.Threading;
using System.Threading.Tasks;
using CompetitionViewer.Services;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.Extensions.Logging;

namespace CompetitionViewer.gRpc
{
    public class RaceService : RaceStreamer.RaceStreamerBase
    {
        private readonly ILogger<RaceService> _logger;
        private readonly ILiveRaceResultsService _liveRaceResultsService;

        public RaceService(ILogger<RaceService> logger, ILiveRaceResultsService liveRaceResultsService)
        {
            _logger = logger;
            _liveRaceResultsService = liveRaceResultsService;
        }

        public override async Task GetStream(Empty request, IServerStreamWriter<RaceEvent> responseStream, ServerCallContext context)
        {
            var id = Guid.NewGuid();

            _logger.LogInformation("RPC connected: {id}", id);

            await _liveRaceResultsService
                .GetStream()
                .ForEachAsync(async data => await OnEventReceived(data, responseStream, context), context.CancellationToken);

            _logger.LogInformation("RPC disconnected: {id}", id);
        }

        private async Task OnEventReceived(RaceDataDto data, IServerStreamWriter<RaceEvent> responseStream, ServerCallContext context)
        {
            var results = data
                .Results
                .Select(x => new RaceEvent.Types.RaceData()
                {
                    DialIn = x.DialIn.ToDuration(),
                    FinishSpeed = x.FinishSpeed,
                    FinishTime = x.FinishTime.ToDuration(),
                    LanePosition = x.LanePosition,
                    RacerId = x.RacerId,
                    ReactionTime = x.ReactionTime.ToDuration(),
                    Result = Map(x.Result),
                    SixSixtyFeetSpeed = x.SixSixtyFeetSpeed,
                    SixSixtyFeetTime = x.SixSixtyFeetTime.ToDuration(),
                    SixtyFeetTime = x.SixtyFeetTime.ToDuration(),
                    ThousandFeetSpeed = x.ThousandFeetSpeed,
                    ThousandFeetTime = x.ThousandFeetTime.ToDuration(),
                    ThreeThirtyFeetTime = x.ThreeThirtyFeetTime.ToDuration(),
                });

            var raceEvent = new RaceEvent()
            {
                EventId = data.EventId,
                RaceId = data.RaceId,
                Round = data.Round,
                Timestamp = Timestamp.FromDateTimeOffset(data.Timestamp.Value),
            };

            raceEvent.RaceResults.Add(results);

            await responseStream.WriteAsync(raceEvent);
        }

        private RaceEvent.Types.RaceData.Types.RaceResult Map(int? result)
        {
            if (result == null)
            {
                return RaceEvent.Types.RaceData.Types.RaceResult.Invalid;
            }

            switch (result.Value)
            {
                case 0: return RaceEvent.Types.RaceData.Types.RaceResult.Winner;
                case 1: return RaceEvent.Types.RaceData.Types.RaceResult.RunnerUp;
            }

            throw new NotImplementedException("Value not mapped: " + result.Value);
        }
    }

    public static class ProtobufExtensions
    {
        public static Duration ToDuration(this TimeSpan? timespan)
        {
            if (timespan == null)
            {
                return null;
            }

            return Duration.FromTimeSpan(timespan.Value);
        }
    }
}
