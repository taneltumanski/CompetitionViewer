namespace CompetitionViewer.Services
{
    public class EDRAEventInfo
    {
        public string Id { get; }
        public string FullUri { get; }
        public int Index { get; }

        public EDRAEventInfo(string id, string fullUri, int index)
        {
            Id = id;
            FullUri = fullUri;
            Index = index;
        }
    }
}
