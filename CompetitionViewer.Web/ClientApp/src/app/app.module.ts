import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

import { AppComponent } from './app.component';
import { NavMenuComponent } from './nav-menu/nav-menu.component';
import { HomeComponent } from './home/home.component';
import { CompetitionComponent } from './competition/competition.component';
import { ApiAuthorizationModule } from 'src/api-authorization/api-authorization.module';
import { AuthorizeGuard } from 'src/api-authorization/authorize.guard';
import { AuthorizeInterceptor } from 'src/api-authorization/authorize.interceptor';
import { LanePipe, RaceResultPipe, TimeDifferencePipe, DialInAccuracyPipe } from './competition/competition.pipes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CompetitionQualificationComponent } from './competition/competition.qualification.component';
import { CompetitionEventInfoComponent } from './competition/competition.eventInfo.component';
import { CompetitionResultsComponent } from './competition/competition.results.component';
import { CompetitionResults2Component } from './competition/competition.results2.component';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

@NgModule({
    declarations: [
        AppComponent,
        NavMenuComponent,
        HomeComponent,

        CompetitionComponent,
        CompetitionQualificationComponent,
        CompetitionEventInfoComponent,
        CompetitionResultsComponent,
        CompetitionResults2Component,

        LanePipe,
        RaceResultPipe,
        TimeDifferencePipe,
        DialInAccuracyPipe,
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
        HttpClientModule,
        FormsModule,
        ApiAuthorizationModule,

        MatSelectModule,
        MatTabsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,

        RouterModule.forRoot([
            //{ path: '', component: HomeComponent, pathMatch: 'full' },
            { path: '', component: CompetitionComponent },
            //{ path: 'fetch-data', component: FetchDataComponent, canActivate: [AuthorizeGuard] },
        ]),
        BrowserAnimationsModule
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthorizeInterceptor, multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
