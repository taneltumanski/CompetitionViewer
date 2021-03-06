import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { LanePipe, RaceResultPipe, TimeDifferencePipe, DialInAccuracyPipe, MyNumberPipe } from './competition/competition.pipes';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CompetitionQualificationComponent } from './competition/competition.qualification.component';
import { CompetitionEventInfoComponent } from './competition/competition.eventInfo.component';
import { CompetitionResultsComponent } from './competition/competition.results.component';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon'
import { MatChipsModule } from '@angular/material/chips'
import { MatMenuModule } from '@angular/material/menu'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';

@NgModule({
    declarations: [
        AppComponent,
        NavMenuComponent,
        HomeComponent,

        CompetitionComponent,
        CompetitionQualificationComponent,
        CompetitionEventInfoComponent,
        CompetitionResultsComponent,

        LanePipe,
        RaceResultPipe,
        TimeDifferencePipe,
        DialInAccuracyPipe,
        MyNumberPipe
    ],
    imports: [
        BrowserModule.withServerTransition({ appId: 'ng-cli-universal' }),
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        ApiAuthorizationModule,

        MatSelectModule,
        MatTabsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatExpansionModule,
        MatIconModule,
        MatChipsModule,
        MatMenuModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatOptionModule,

        DragDropModule,

        RouterModule.forRoot([
            //{ path: '', component: HomeComponent, pathMatch: 'full' },
            { path: '', component: CompetitionComponent },
            //{ path: 'fetch-data', component: FetchDataComponent, canActivate: [AuthorizeGuard] },
        ]),
        BrowserAnimationsModule
    ],
    providers: [
        DatePipe,
        DecimalPipe,

        { provide: HTTP_INTERCEPTORS, useClass: AuthorizeInterceptor, multi: true }
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
