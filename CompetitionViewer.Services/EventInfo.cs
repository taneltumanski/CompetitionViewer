namespace CompetitionViewer.Services
{
    public class EDRAEventInfo
    {
        public string Id { get; }
        public string FullUri { get; }

        public EDRAEventInfo(string id, string fullUri)
        {
            Id = id;
            FullUri = fullUri;
        }
    }
}
