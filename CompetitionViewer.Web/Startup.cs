using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.SpaServices.AngularCli;
using Microsoft.EntityFrameworkCore;
using CompetitionViewer.Web.Data;
using CompetitionViewer.Web.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using CompetitionViewer.Services;
using System;
using CompetitionViewer.Web.Hubs;
using Microsoft.AspNetCore.HttpOverrides;
using Functional;
using Microsoft.Extensions.Http.Logging;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.AspNetCore.SignalR.Protocol;
using Microsoft.AspNetCore.Connections;
using System.Buffers;
using System.IO;
using ICSharpCode.SharpZipLib.GZip;
using Microsoft.Extensions.Options;
using CompetitionViewer.Services.ResultsRequesters.EDRA;
using System.Net.Http;
using System.Net;
using System.Reactive.Concurrency;

namespace CompetitionViewer.Web
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddResponseCompression();

            services.AddMemoryCache();
            services
                .AddSignalR(o =>
                {
                    o.EnableDetailedErrors = true;
                    o.HandshakeTimeout = TimeSpan.FromSeconds(5);
                    o.KeepAliveInterval = TimeSpan.FromSeconds(10);
                })
                .AddJsonProtocol(x =>
                //.AddCompressedJsonProtocol(x =>
                {
                    x.PayloadSerializerOptions.IgnoreNullValues = false;
                })
                ;

            //services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));

            //services
            //    .AddDefaultIdentity<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
            //    .AddEntityFrameworkStores<ApplicationDbContext>();

            //services
            //    .AddIdentityServer()
            //    .AddApiAuthorization<ApplicationUser, ApplicationDbContext>();

            //services
            //    .AddAuthentication()
            //    .AddIdentityServerJwt()
                //.AddGoogle(options =>
                //{
                //    var googleAuthNSection = Configuration.GetSection("Authentication:Google");

                //    options.ClientId = googleAuthNSection["ClientId"];
                //    options.ClientSecret = googleAuthNSection["ClientSecret"];
                //})
                ;

            services.AddControllersWithViews();
            services.AddRazorPages();

            // In production, the Angular files will be served from this directory
            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "ClientApp/dist";
            });

            services
                .AddHttpClient("EDRAClient")
                .ConfigurePrimaryHttpMessageHandler(messageHandler =>
                {
                    var handler = new HttpClientHandler();

                    if (handler.SupportsAutomaticDecompression)
                    {
                        handler.AutomaticDecompression = DecompressionMethods.Deflate | DecompressionMethods.GZip;
                    }
                    return handler;
                });

            //services.AddCors(o =>
            //{
            //    o.AddPolicy("MyPolicy", builder =>
            //    {
            //        builder.WithOrigins("localhost:5000", "YourCustomDomain");
            //        builder.WithMethods("POST, OPTIONS");
            //        builder.AllowAnyHeader();
            //        builder.WithExposedHeaders("Grpc-Status", "Grpc-Message");
            //    });
            //});

            services.AddSingleton<ILiveRaceResultsService, CachedLiveRaceResultsService>();
            services.AddTransient<EDRAResultService>();
            services.AddTransient<IEventInfoProvider, EventInfoProvider>();
            services.AddSingleton<MessagingListener>();
            services.AddSingleton<HostedServiceManager>();
            services.AddSingleton<IRaceService, RaceService>();
            services.AddSingleton<IRaceUpdateService, RaceUpdateService>();
            services.AddSingleton<IScheduler>(Scheduler.Default);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseResponseCompression();
            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseDatabaseErrorPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            if (!env.IsDevelopment())
            {
                app.UseSpaStaticFiles();
            }

            app.UseRouting();

            //app.UseAuthentication();
            //app.UseIdentityServer();
            //app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<CompetitionHub>("/messaging");

                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller}/{action=Index}/{id?}");

                endpoints.MapRazorPages();
            });

            app.UseSpa(spa =>
            {
                // To learn more about options for serving an Angular SPA from ASP.NET Core,
                // see https://go.microsoft.com/fwlink/?linkid=864501

                spa.Options.SourcePath = "ClientApp";

                if (env.IsDevelopment())
                {
                    spa.UseAngularCliServer(npmScript: "start");
                }
            });
        }
    }

    /// <summary>
    /// Extension methods for <see cref="ISignalRBuilder"/>.
    /// </summary>
    public static class CompressedJsonProtocolDependencyInjectionExtensions
    {
        /// <summary>
        /// Enables the JSON protocol for SignalR.
        /// </summary>
        /// <remarks>
        /// This has no effect if the JSON protocol has already been enabled.
        /// </remarks>
        /// <param name="builder">The <see cref="ISignalRBuilder"/> representing the SignalR server to add JSON protocol support to.</param>
        /// <returns>The value of <paramref name="builder"/></returns>
        public static TBuilder AddCompressedJsonProtocol<TBuilder>(this TBuilder builder) where TBuilder : ISignalRBuilder
            => AddCompressedJsonProtocol(builder, _ => { });

        /// <summary>
        /// Enables the JSON protocol for SignalR and allows options for the JSON protocol to be configured.
        /// </summary>
        /// <remarks>
        /// Any options configured here will be applied, even if the JSON protocol has already been registered with the server.
        /// </remarks>
        /// <param name="builder">The <see cref="ISignalRBuilder"/> representing the SignalR server to add JSON protocol support to.</param>
        /// <param name="configure">A delegate that can be used to configure the <see cref="JsonHubProtocolOptions"/></param>
        /// <returns>The value of <paramref name="builder"/></returns>
        public static TBuilder AddCompressedJsonProtocol<TBuilder>(this TBuilder builder, Action<JsonHubProtocolOptions> configure) where TBuilder : ISignalRBuilder
        {
            builder.Services.TryAddEnumerable(ServiceDescriptor.Singleton<IHubProtocol, CompressedJsonHubProtocol>());
            builder.Services.Configure(configure);
            return builder;
        }
    }

    internal class CompressedJsonHubProtocol : IHubProtocol
    {
        private readonly JsonHubProtocol _jsonHubProtocol;

        public string Name { get; } = "compressedJson";
        public TransferFormat TransferFormat { get; } = TransferFormat.Binary;
        public int Version => _jsonHubProtocol.Version;

        public CompressedJsonHubProtocol(IOptions<JsonHubProtocolOptions> options)
        {
            _jsonHubProtocol = new JsonHubProtocol(options);
        }

        public ReadOnlyMemory<byte> GetMessageBytes(HubMessage message)
        {
            return HubProtocolExtensions.GetMessageBytes(this, message);
        }

        public bool IsVersionSupported(int version)
        {
            return _jsonHubProtocol.IsVersionSupported(version);
        }

        public bool TryParseMessage(ref ReadOnlySequence<byte> input, IInvocationBinder binder, out HubMessage message)
        {
            using var inStream = new MemoryStream(input.ToArray());
            using var outStream = new MemoryStream();

            GZip.Decompress(inStream, outStream, false);

            var decompressedInput = new ReadOnlySequence<byte>(outStream.ToArray());

            return _jsonHubProtocol.TryParseMessage(ref decompressedInput, binder, out message);
        }

        public void WriteMessage(HubMessage message, IBufferWriter<byte> output)
        {
            var myWriter = new ArrayBufferWriter<byte>(1024);

            _jsonHubProtocol.WriteMessage(message, myWriter);

            using var inStream = new MemoryStream(myWriter.WrittenMemory.ToArray());
            using var outStream = new MemoryStream();

            GZip.Compress(inStream, outStream, false, 1024, 9);

            var compressedOutput = outStream.ToArray();

            output.Write(compressedOutput);
        }
    }
}
