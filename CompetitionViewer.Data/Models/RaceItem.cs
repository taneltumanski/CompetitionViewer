using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CompetitionViewer.Data.Models
{
    public class RaceItem
    {
        public DateTimeOffset? Timestamp { get; set; }
        public string EventId { get; set; }
        public string RaceId { get; set; }
        public string Round { get; set; }
        public string Lane { get; set; }

        public string RacerId { get; set; }
        public int? Result { get; set; }
        
        public TimeSpan? DialIn { get; set; }
        public TimeSpan? ReactionTime { get; set; }
        public TimeSpan? SixtyFeetTime { get; set; }
        public TimeSpan? ThreeThirtyFeetTime { get; set; }
        public TimeSpan? SixSixtyFeetTime { get; set; }
        public double? SixSixtyFeetSpeed { get; set; }
        public TimeSpan? ThousandFeetTime { get; set; }
        public double? ThousandFeetSpeed { get; set; }
        public TimeSpan? FinishTime { get; set; }
        public double? FinishSpeed { get; set; }
    }
}
