using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CompetitionViewer.Web.Angular.Models
{
    public class Event
    {
        public virtual Guid Id { get; set; }

        public virtual List<Race> Races { get; set; }
    }

    public class Race
    {
        public virtual Guid Id { get; set; }
        public virtual string OriginalId { get; set; }

        public virtual List<RaceParticipant> RaceParticipants { get; set; }
    }

    public class RaceParticipant
    {
        public virtual Guid Id { get; set; }
        public virtual string RacerId { get; set; }
    }

    public class BracketTemplate
    {
        public virtual Guid Id { get; set; }

        public virtual string Name { get; set; }
    }

    public class BracketGrouping
    {
        public virtual Guid Id { get; set; }
        public string RoundName { get; set; }

        public List<BracketGrouping> ParticipantsFrom { get; set; }
        public int MyProperty { get; set; }
    }
}
