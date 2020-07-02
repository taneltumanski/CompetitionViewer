using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CompetitionViewer.Data.Models
{
    public class Event
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }

        private class EventConfiguration : IEntityTypeConfiguration<Event>
        {
            public void Configure(EntityTypeBuilder<Event> builder)
            {
                builder.Property(x => x.Id).HasDefaultValueSql("newid()");
                builder.HasKey(x => x.Id);

                builder.Property(x => x.Name).IsRequired();
                builder.HasIndex(x => x.Name).IsUnique();
            }
        }
    }    
}
