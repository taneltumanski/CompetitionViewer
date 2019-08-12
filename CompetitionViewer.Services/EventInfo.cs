namespace CompetitionViewer.Services
{
    public class EventInfo
    {
        public string Id { get; }
        public string FullUri { get; }

        public EventInfo(string id, string fullUri)
        {
            Id = id;
            FullUri = fullUri;
        }
    }
}
