import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { FeatureGuard } from '../../guards/feature.guard';
import { DocumentsComponent } from '../../components/documents/documents.component';
import { DocumentDetailComponent } from '../../components/document-detail/document-detail.component';
import { DocumentShareDialogComponent } from '../../components/document-share-dialog/document-share-dialog.component';
import { DocumentAccessComponent } from '../../components/document-access/document-access.component';

const routes: Routes = [
  { path: '', component: DocumentsComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'DOCUMENT_VAULT' } },
  { path: 'shared/:token', component: DocumentAccessComponent },  // public — must be before :id
  { path: ':id', component: DocumentDetailComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'DOCUMENT_VAULT' } }
];

@NgModule({
  declarations: [
    DocumentsComponent,
    DocumentDetailComponent,
    DocumentShareDialogComponent,
    DocumentAccessComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class DocumentsModule {}
