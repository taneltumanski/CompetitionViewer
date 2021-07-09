using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Disposables;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace CompetitionViewer.Services
{
    public class HostedServiceManager : IAsyncDisposable
    {
        private readonly ConcurrentBag<IHostedService> _services = new ConcurrentBag<IHostedService>();
        private readonly IHostApplicationLifetime _lifetime;
        private readonly CompositeDisposable _disposable;

        public HostedServiceManager(IHostApplicationLifetime lifetime)
        {
            _lifetime = lifetime;
            _disposable = new CompositeDisposable(lifetime.ApplicationStopping.Register(OnApplicationStopping));
        }

        private void OnApplicationStopping()
        {
            var tasks = _services
                .Select(x => Task.Run(() => x.StopAsync(_lifetime.ApplicationStopped)))
                .ToArray();

            try
            {
                Task.WaitAll(tasks, _lifetime.ApplicationStopped);
            }
            catch { }
        }

        public Task AddHostedService(IHostedService service)
        {
            _services.Add(service);

            return Task.Run(() => service.StartAsync(_lifetime.ApplicationStopping));
        }

        public async ValueTask DisposeAsync()
        {
            _disposable.Dispose();

            foreach (var service in _services)
            {
                switch (service)
                {
                    case IAsyncDisposable asyncDisposable:
                        await asyncDisposable.DisposeAsync();
                        break;
                    case IDisposable disposable:
                        disposable.Dispose();
                        break;
                }
            }
        }
    }

    public interface IHostedServiceProvider
    {
        IHostedService GetHostedService();
    }
}
