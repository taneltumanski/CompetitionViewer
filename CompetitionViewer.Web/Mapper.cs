using CompetitionViewer.Services;
using CompetitionViewer.Web.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CompetitionViewer.Web
{
    public static class Mapper
    {
        public static RaceEventDataMessage FromDto(RaceDataDto data)
        {
            return new RaceEventDataMessage()
            {
                Hashcode = data.Hashcode,
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
            };
        }

        public static RaceEventMessage FromDto(EventDataDto data)
        {
            return new RaceEventMessage()
            {
                Id = data.Id,
                Name = data.Name
            };
        }
    }
}
