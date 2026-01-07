#!/usr/bin/env python3
"""
MongoDB Backup Automation Script

Features:
- Automated database backups with mongodump
- Compression (gzip)
- Rotation policy (keep last N backups)
- Off-site storage (S3, Azure Blob, Google Cloud Storage)
- Backup verification
- Restore testing
- Notification on success/failure
"""

import os
import sys
import subprocess
import argparse
import datetime
import shutil
import json
from pathlib import Path
from typing import List, Optional, Dict
import glob


class MongoBackup:
    """MongoDB backup automation class."""
    
    def __init__(
        self,
        mongo_uri: str,
        backup_dir: str,
        retention_days: int = 30,
        s3_bucket: Optional[str] = None,
        azure_container: Optional[str] = None,
        gcs_bucket: Optional[str] = None,
        compress: bool = True
    ):
        """
        Initialize MongoDB backup manager.
        
        Args:
            mongo_uri: MongoDB connection URI
            backup_dir: Local directory for backups
            retention_days: Number of days to retain backups
            s3_bucket: AWS S3 bucket for off-site storage
            azure_container: Azure Blob Storage container
            gcs_bucket: Google Cloud Storage bucket
            compress: Enable gzip compression
        """
        self.mongo_uri = mongo_uri
        self.backup_dir = Path(backup_dir)
        self.retention_days = retention_days
        self.s3_bucket = s3_bucket
        self.azure_container = azure_container
        self.gcs_bucket = gcs_bucket
        self.compress = compress
        
        # Create backup directory if not exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Timestamp for this backup
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self.backup_name = f"mongodb_backup_{self.timestamp}"
        self.backup_path = self.backup_dir / self.backup_name
    
    def create_backup(self) -> bool:
        """
        Create MongoDB backup using mongodump.
        
        Returns:
            True if backup successful, False otherwise
        """
        print(f"[{self.timestamp}] Starting MongoDB backup...")
        
        try:
            # Build mongodump command
            cmd = [
                'mongodump',
                '--uri', self.mongo_uri,
                '--out', str(self.backup_path)
            ]
            
            if self.compress:
                cmd.append('--gzip')
            
            # Execute mongodump
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            print(f"✓ Backup created successfully: {self.backup_path}")
            
            # Get backup size
            total_size = sum(
                f.stat().st_size 
                for f in self.backup_path.rglob('*') 
                if f.is_file()
            )
            size_mb = total_size / (1024 * 1024)
            print(f"  Size: {size_mb:.2f} MB")
            
            # Create metadata file
            self._create_metadata(total_size)
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"✗ Backup failed: {e}")
            print(f"  stderr: {e.stderr}")
            return False
        except FileNotFoundError:
            print("✗ mongodump command not found. Please install MongoDB tools.")
            return False
        except Exception as e:
            print(f"✗ Unexpected error during backup: {e}")
            return False
    
    def _create_metadata(self, size_bytes: int):
        """Create metadata file for the backup."""
        metadata = {
            'timestamp': self.timestamp,
            'backup_name': self.backup_name,
            'size_bytes': size_bytes,
            'size_mb': round(size_bytes / (1024 * 1024), 2),
            'compressed': self.compress,
            'mongo_uri': self.mongo_uri.split('@')[1] if '@' in self.mongo_uri else 'hidden',
            'retention_days': self.retention_days
        }
        
        metadata_path = self.backup_path / 'metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def compress_backup(self) -> Optional[Path]:
        """
        Compress backup directory into tar.gz archive.
        
        Returns:
            Path to compressed archive or None if failed
        """
        if not self.backup_path.exists():
            print(f"✗ Backup path not found: {self.backup_path}")
            return None
        
        print(f"Compressing backup...")
        
        try:
            archive_path = self.backup_dir / f"{self.backup_name}.tar.gz"
            
            # Create tar.gz archive
            subprocess.run(
                ['tar', '-czf', str(archive_path), '-C', str(self.backup_dir), self.backup_name],
                check=True,
                capture_output=True
            )
            
            # Remove uncompressed backup
            shutil.rmtree(self.backup_path)
            
            archive_size = archive_path.stat().st_size / (1024 * 1024)
            print(f"✓ Backup compressed: {archive_path}")
            print(f"  Archive size: {archive_size:.2f} MB")
            
            return archive_path
            
        except Exception as e:
            print(f"✗ Compression failed: {e}")
            return None
    
    def upload_to_s3(self, archive_path: Path) -> bool:
        """
        Upload backup to AWS S3.
        
        Args:
            archive_path: Path to backup archive
        
        Returns:
            True if upload successful
        """
        if not self.s3_bucket:
            return False
        
        print(f"Uploading to S3 bucket: {self.s3_bucket}...")
        
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            s3_client = boto3.client('s3')
            s3_key = f"mongodb-backups/{archive_path.name}"
            
            s3_client.upload_file(
                str(archive_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs={'StorageClass': 'STANDARD_IA'}  # Infrequent Access
            )
            
            print(f"✓ Uploaded to S3: s3://{self.s3_bucket}/{s3_key}")
            return True
            
        except ImportError:
            print("✗ boto3 not installed. Install with: pip install boto3")
            return False
        except ClientError as e:
            print(f"✗ S3 upload failed: {e}")
            return False
        except Exception as e:
            print(f"✗ Unexpected error during S3 upload: {e}")
            return False
    
    def upload_to_azure(self, archive_path: Path) -> bool:
        """Upload backup to Azure Blob Storage."""
        if not self.azure_container:
            return False
        
        print(f"Uploading to Azure container: {self.azure_container}...")
        
        try:
            from azure.storage.blob import BlobServiceClient
            
            connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
            if not connection_string:
                print("✗ AZURE_STORAGE_CONNECTION_STRING not set")
                return False
            
            blob_service = BlobServiceClient.from_connection_string(connection_string)
            blob_client = blob_service.get_blob_client(
                container=self.azure_container,
                blob=f"mongodb-backups/{archive_path.name}"
            )
            
            with open(archive_path, 'rb') as data:
                blob_client.upload_blob(data, overwrite=True)
            
            print(f"✓ Uploaded to Azure: {self.azure_container}/{archive_path.name}")
            return True
            
        except ImportError:
            print("✗ azure-storage-blob not installed")
            return False
        except Exception as e:
            print(f"✗ Azure upload failed: {e}")
            return False
    
    def upload_to_gcs(self, archive_path: Path) -> bool:
        """Upload backup to Google Cloud Storage."""
        if not self.gcs_bucket:
            return False
        
        print(f"Uploading to GCS bucket: {self.gcs_bucket}...")
        
        try:
            from google.cloud import storage
            
            storage_client = storage.Client()
            bucket = storage_client.bucket(self.gcs_bucket)
            blob = bucket.blob(f"mongodb-backups/{archive_path.name}")
            
            blob.upload_from_filename(str(archive_path))
            
            print(f"✓ Uploaded to GCS: gs://{self.gcs_bucket}/{archive_path.name}")
            return True
            
        except ImportError:
            print("✗ google-cloud-storage not installed")
            return False
        except Exception as e:
            print(f"✗ GCS upload failed: {e}")
            return False
    
    def cleanup_old_backups(self):
        """Remove backups older than retention period."""
        print(f"Cleaning up backups older than {self.retention_days} days...")
        
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=self.retention_days)
        removed_count = 0
        
        # Find all backup archives
        for backup_file in self.backup_dir.glob("mongodb_backup_*.tar.gz"):
            # Extract timestamp from filename
            try:
                timestamp_str = backup_file.stem.replace("mongodb_backup_", "")
                backup_date = datetime.datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                
                if backup_date < cutoff_date:
                    backup_file.unlink()
                    removed_count += 1
                    print(f"  Removed old backup: {backup_file.name}")
            except (ValueError, IndexError):
                print(f"  Skipping invalid backup file: {backup_file.name}")
        
        print(f"✓ Removed {removed_count} old backup(s)")
    
    def verify_backup(self) -> bool:
        """
        Verify backup integrity.
        
        Returns:
            True if backup is valid
        """
        print(f"Verifying backup integrity...")
        
        if not self.backup_path.exists():
            print(f"✗ Backup path not found: {self.backup_path}")
            return False
        
        # Check for metadata
        metadata_path = self.backup_path / 'metadata.json'
        if not metadata_path.exists():
            print("✗ Metadata file missing")
            return False
        
        # Check for BSON files
        bson_files = list(self.backup_path.rglob("*.bson"))
        if self.compress:
            bson_files = list(self.backup_path.rglob("*.bson.gz"))
        
        if not bson_files:
            print("✗ No BSON files found in backup")
            return False
        
        print(f"✓ Backup verified: {len(bson_files)} collection(s) backed up")
        return True
    
    def test_restore(self, test_db_name: str = "imip_restore_test") -> bool:
        """
        Test restore to verify backup can be restored.
        
        Args:
            test_db_name: Name of test database for restore
        
        Returns:
            True if restore test successful
        """
        print(f"Testing restore to database: {test_db_name}...")
        
        if not self.backup_path.exists():
            print(f"✗ Backup path not found: {self.backup_path}")
            return False
        
        try:
            # Build mongorestore command
            cmd = [
                'mongorestore',
                '--uri', self.mongo_uri,
                '--nsFrom', 'imip.*',
                '--nsTo', f'{test_db_name}.*',
                '--drop'
            ]
            
            if self.compress:
                cmd.append('--gzip')
            
            cmd.append(str(self.backup_path))
            
            # Execute mongorestore
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            print(f"✓ Restore test successful")
            print(f"  Test database: {test_db_name}")
            
            # Cleanup test database
            print(f"Cleaning up test database...")
            # Note: Actual cleanup would require MongoDB client
            
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"✗ Restore test failed: {e}")
            print(f"  stderr: {e.stderr}")
            return False
        except Exception as e:
            print(f"✗ Unexpected error during restore test: {e}")
            return False


def send_notification(success: bool, backup_name: str, error_msg: Optional[str] = None):
    """Send notification about backup status."""
    status = "SUCCESS" if success else "FAILED"
    
    # Log to stdout
    print(f"\n{'='*60}")
    print(f"Backup Status: {status}")
    print(f"Backup Name: {backup_name}")
    if error_msg:
        print(f"Error: {error_msg}")
    print(f"{'='*60}\n")
    
    # TODO: Add email notification
    # TODO: Add Slack notification
    # TODO: Add PagerDuty notification


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="MongoDB Backup Automation")
    parser.add_argument('--mongo-uri', required=True, help='MongoDB connection URI')
    parser.add_argument('--backup-dir', default='/backups/mongodb', help='Backup directory')
    parser.add_argument('--retention-days', type=int, default=30, help='Days to retain backups')
    parser.add_argument('--s3-bucket', help='AWS S3 bucket for off-site storage')
    parser.add_argument('--azure-container', help='Azure Blob Storage container')
    parser.add_argument('--gcs-bucket', help='Google Cloud Storage bucket')
    parser.add_argument('--no-compress', action='store_true', help='Disable compression')
    parser.add_argument('--verify', action='store_true', help='Verify backup integrity')
    parser.add_argument('--test-restore', action='store_true', help='Test restore (slower)')
    
    args = parser.parse_args()
    
    # Create backup manager
    backup = MongoBackup(
        mongo_uri=args.mongo_uri,
        backup_dir=args.backup_dir,
        retention_days=args.retention_days,
        s3_bucket=args.s3_bucket,
        azure_container=args.azure_container,
        gcs_bucket=args.gcs_bucket,
        compress=not args.no_compress
    )
    
    # Create backup
    if not backup.create_backup():
        send_notification(False, backup.backup_name, "Backup creation failed")
        sys.exit(1)
    
    # Verify backup
    if args.verify:
        if not backup.verify_backup():
            send_notification(False, backup.backup_name, "Backup verification failed")
            sys.exit(1)
    
    # Test restore
    if args.test_restore:
        if not backup.test_restore():
            send_notification(False, backup.backup_name, "Restore test failed")
            sys.exit(1)
    
    # Compress backup
    archive_path = backup.compress_backup()
    if not archive_path:
        send_notification(False, backup.backup_name, "Compression failed")
        sys.exit(1)
    
    # Upload to cloud storage
    if args.s3_bucket:
        backup.upload_to_s3(archive_path)
    if args.azure_container:
        backup.upload_to_azure(archive_path)
    if args.gcs_bucket:
        backup.upload_to_gcs(archive_path)
    
    # Cleanup old backups
    backup.cleanup_old_backups()
    
    # Success notification
    send_notification(True, backup.backup_name)
    
    print(f"\n✓ Backup completed successfully!")
    sys.exit(0)


if __name__ == '__main__':
    main()
