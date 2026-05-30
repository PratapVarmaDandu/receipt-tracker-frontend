import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { LoggerService } from '../../services/logger.service';
import { Group } from '../../models/group.model';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss']
})
export class GroupDetailComponent implements OnInit {
  private readonly source = 'GroupDetailComponent';

  group: Group | null = null;
  loading = true;
  notFound = false;
  qrDataUrl = '';

  constructor(
    private route: ActivatedRoute,
    private groupService: GroupService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.groupService.getGroup(id).subscribe(group => {
      if (!group) { this.notFound = true; }
      else {
        this.group = group;
        this.generateQr();
      }
      this.loading = false;
    });
  }

  get joinUrl(): string {
    return `${window.location.origin}/group/join/${this.group?.inviteToken}`;
  }

  private generateQr(): void {
    QRCode.toDataURL(this.joinUrl, { width: 200, margin: 1 })
      .then(url => { this.qrDataUrl = url; })
      .catch(err => this.logger.error(this.source, 'QR generation failed', err));
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.joinUrl).catch(() => {});
  }

  shareViaWhatsApp(): void {
    const text = encodeURIComponent(`Join my expense group "${this.group?.name}": ${this.joinUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  shareViaEmail(): void {
    const subject = encodeURIComponent(`Join my expense group: ${this.group?.name}`);
    const body = encodeURIComponent(`Hi,\n\nI'd like you to join my expense group "${this.group?.name}".\n\nClick here to join: ${this.joinUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  shareViaTelegram(): void {
    const text = encodeURIComponent(`Join my expense group "${this.group?.name}": ${this.joinUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(this.joinUrl)}&text=${text}`, '_blank');
  }

  shareNative(): void {
    if (navigator.share) {
      navigator.share({ title: `Join ${this.group?.name}`, text: `Join my expense group`, url: this.joinUrl });
    }
  }

  get hasNativeShare(): boolean {
    return !!navigator.share;
  }
}
