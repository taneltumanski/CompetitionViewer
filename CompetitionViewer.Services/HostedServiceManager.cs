using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

namespace CompetitionViewer.Services
{
    public class HostedServiceManager : IAsyncDisposable
    {
        private readonly ConcurrentBag<IHostedService> _services = new ConcurrentBag<IHostedService>();
        private readonly IHostApplicationLifetime _lifetime;

        public HostedServiceManager(IHostApplicationLifetime lifetime)
        {
            _lifetime = lifetime;
        }

        public async Task AddHostedService(IHostedService service)
        {
            _services.Add(service);

            await service.StartAsync(_lifetime.ApplicationStopping);
        }

        public async ValueTask DisposeAsync()
        {
            foreach (var service in _services)
            {
                try
                {
                    await service.StopAsync(_lifetime.ApplicationStopped);
                }
                catch { }

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
