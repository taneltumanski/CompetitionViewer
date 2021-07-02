using System;
using System.Collections.Generic;

namespace CompetitionViewer.Web.Hubs
{
    public class CompetitionMessage
    {
        public int MessageIndex { get; set; }
        public List<RaceEventMessage> Messages { get; set; }
    }

    public class RaceEventMessage
    {
        public string EventId { get; set; }
        public string RaceId { get; set; }
        public string Round { get; set; }
        public long Timestamp { get; set; }

        public List<RaceEventResult> Results { get; set; }
    }

    public class RaceEventResult
    {
        public string RacerId { get; set; }
        public string Lane { get; set; }
        public int? Result { get; set; }

        public double? DialIn { get; set; }
        public double? ReactionTime { get; set; }
        public double? SixtyFeetTime { get; set; }
        public double? ThreeThirtyFeetTime { get; set; }
        public double? SixSixtyFeetTime { get; set; }
        public double? SixSixtyFeetSpeed { get; set; }
        public double? ThousandFeetTime { get; set; }
        public double? ThousandFeetSpeed { get; set; }
        public double? FinishTime { get; set; }
        public double? FinishSpeed { get; set; }
    }
}