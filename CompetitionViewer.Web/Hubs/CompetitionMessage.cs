using System;
using System.Collections.Generic;

namespace CompetitionViewer.Web.Hubs
{
    public class CompetitionMessage
    {
        public IEnumerable<string> RemovedMessageIds { get; set; } = new List<string>();
        public IEnumerable<RaceEventDataMessage> Messages { get; set; } = new List<RaceEventDataMessage>();
    }

    public class RaceEventMessage
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }

    public class RaceEventDataMessage
    {
        public string Hashcode { get; set; }
        public string EventId { get; set; }
        public string RaceId { get; set; }
        public string Round { get; set; }
        public long Timestamp { get; set; }
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