"""
Secrets loader utility for loading secrets from various secret managers.

Supports:
- Local .env files (development)
- AWS Secrets Manager (production)
- HashiCorp Vault (production)
- Azure Key Vault (production)
- Environment variables (fallback)
"""

import os
import json
from typing import Dict, Optional
from dotenv import load_dotenv


def load_secrets(environment: Optional[str] = None) -> Dict[str, str]:
    """
    Load secrets based on environment.
    
    Priority:
    1. AWS Secrets Manager (if AWS_SECRET_NAME is set)
    2. HashiCorp Vault (if VAULT_ADDR is set)
    3. Azure Key Vault (if AZURE_VAULT_URL is set)
    4. .env file (development)
    5. Environment variables (fallback)
    
    Args:
        environment: Environment name (development, staging, production)
                    If not provided, reads from ENVIRONMENT env var
    
    Returns:
        Dictionary of secret key-value pairs
    """
    if environment is None:
        environment = os.getenv('ENVIRONMENT', 'development')
    
    # Try AWS Secrets Manager first
    if os.getenv('AWS_SECRET_NAME'):
        try:
            return load_aws_secrets()
        except Exception as e:
            print(f"Warning: Failed to load from AWS Secrets Manager: {e}")
    
    # Try HashiCorp Vault
    if os.getenv('VAULT_ADDR'):
        try:
            return load_vault_secrets()
        except Exception as e:
            print(f"Warning: Failed to load from Vault: {e}")
    
    # Try Azure Key Vault
    if os.getenv('AZURE_VAULT_URL'):
        try:
            return load_azure_secrets()
        except Exception as e:
            print(f"Warning: Failed to load from Azure Key Vault: {e}")
    
    # Fallback to .env file (development)
    if environment == 'development':
        load_dotenv()
    
    # Return environment variables as dict
    return {
        'SECRET_KEY': os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production'),
        'REFRESH_SECRET_KEY': os.getenv('REFRESH_SECRET_KEY', 'dev-refresh-secret-key'),
        'MONGO_URI': os.getenv('MONGO_URI', 'mongodb://localhost:27017/imip'),
        'OPENAI_API_KEY': os.getenv('OPENAI_API_KEY', ''),
    }


def load_aws_secrets() -> Dict[str, str]:
    """Load secrets from AWS Secrets Manager."""
    try:
        import boto3
        from botocore.exceptions import ClientError
    except ImportError:
        raise ImportError("boto3 is required for AWS Secrets Manager. Install with: pip install boto3")
    
    secret_name = os.getenv('AWS_SECRET_NAME', 'imip/production')
    region_name = os.getenv('AWS_REGION', 'us-east-1')
    
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        
        if 'SecretString' in response:
            secret_dict = json.loads(response['SecretString'])
        else:
            # Binary secret
            import base64
            secret_dict = json.loads(base64.b64decode(response['SecretBinary']))
        
        print(f"✓ Loaded secrets from AWS Secrets Manager: {secret_name}")
        return secret_dict
    
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceNotFoundException':
            raise Exception(f"Secret {secret_name} not found in AWS Secrets Manager")
        elif error_code == 'InvalidRequestException':
            raise Exception(f"Invalid request to AWS Secrets Manager: {e}")
        elif error_code == 'InvalidParameterException':
            raise Exception(f"Invalid parameter: {e}")
        elif error_code == 'DecryptionFailure':
            raise Exception(f"Failed to decrypt secret: {e}")
        elif error_code == 'InternalServiceError':
            raise Exception(f"AWS Secrets Manager internal error: {e}")
        else:
            raise Exception(f"AWS Secrets Manager error: {e}")


def load_vault_secrets() -> Dict[str, str]:
    """Load secrets from HashiCorp Vault."""
    try:
        import hvac
    except ImportError:
        raise ImportError("hvac is required for HashiCorp Vault. Install with: pip install hvac")
    
    vault_url = os.getenv('VAULT_ADDR', 'http://localhost:8200')
    vault_token = os.getenv('VAULT_TOKEN')
    
    if not vault_token:
        raise Exception("VAULT_TOKEN environment variable is required for Vault authentication")
    
    client = hvac.Client(url=vault_url, token=vault_token)
    
    if not client.is_authenticated():
        raise Exception("Vault authentication failed. Check VAULT_TOKEN")
    
    secret_path = os.getenv('VAULT_SECRET_PATH', 'imip/production')
    mount_point = os.getenv('VAULT_MOUNT_POINT', 'secret')
    
    try:
        # Try KV v2 first
        response = client.secrets.kv.v2.read_secret_version(
            path=secret_path,
            mount_point=mount_point
        )
        secret_dict = response['data']['data']
    except Exception as e:
        # Fallback to KV v1
        try:
            response = client.secrets.kv.v1.read_secret(
                path=secret_path,
                mount_point=mount_point
            )
            secret_dict = response['data']
        except Exception as e2:
            raise Exception(f"Failed to read from Vault: {e} (v2) and {e2} (v1)")
    
    print(f"✓ Loaded secrets from HashiCorp Vault: {secret_path}")
    return secret_dict


def load_azure_secrets() -> Dict[str, str]:
    """Load secrets from Azure Key Vault."""
    try:
        from azure.keyvault.secrets import SecretClient
        from azure.identity import DefaultAzureCredential
    except ImportError:
        raise ImportError(
            "azure-keyvault-secrets and azure-identity are required. "
            "Install with: pip install azure-keyvault-secrets azure-identity"
        )
    
    vault_url = os.getenv('AZURE_VAULT_URL')
    if not vault_url:
        raise Exception("AZURE_VAULT_URL environment variable is required")
    
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=vault_url, credential=credential)
    
    # Map of secret names in Azure Key Vault
    secret_names = {
        'SECRET_KEY': os.getenv('AZURE_SECRET_KEY_NAME', 'SECRET-KEY'),
        'REFRESH_SECRET_KEY': os.getenv('AZURE_REFRESH_SECRET_KEY_NAME', 'REFRESH-SECRET-KEY'),
        'MONGO_URI': os.getenv('AZURE_MONGO_URI_NAME', 'MONGO-URI'),
        'OPENAI_API_KEY': os.getenv('AZURE_OPENAI_API_KEY_NAME', 'OPENAI-API-KEY'),
    }
    
    secret_dict = {}
    for key, azure_name in secret_names.items():
        try:
            secret = client.get_secret(azure_name)
            secret_dict[key] = secret.value
        except Exception as e:
            print(f"Warning: Failed to load {azure_name} from Azure Key Vault: {e}")
    
    if not secret_dict:
        raise Exception("No secrets loaded from Azure Key Vault")
    
    print(f"✓ Loaded secrets from Azure Key Vault: {vault_url}")
    return secret_dict


def validate_secrets(secrets: Dict[str, str], required_keys: Optional[list] = None) -> bool:
    """
    Validate that required secrets are present.
    
    Args:
        secrets: Dictionary of secrets
        required_keys: List of required secret keys
    
    Returns:
        True if all required secrets are present
    
    Raises:
        ValueError if required secrets are missing
    """
    if required_keys is None:
        required_keys = ['SECRET_KEY', 'MONGO_URI']
    
    missing_keys = [key for key in required_keys if not secrets.get(key)]
    
    if missing_keys:
        raise ValueError(f"Missing required secrets: {', '.join(missing_keys)}")
    
    return True


# Example usage
if __name__ == "__main__":
    import sys
    
    print("Testing secrets loader...")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print()
    
    try:
        secrets = load_secrets()
        print("Successfully loaded secrets:")
        for key in secrets.keys():
            value = secrets[key]
            if value:
                masked_value = value[:4] + "*" * (len(value) - 8) + value[-4:] if len(value) > 8 else "****"
            else:
                masked_value = "(empty)"
            print(f"  {key}: {masked_value}")
        
        print("\nValidating secrets...")
        validate_secrets(secrets)
        print("✓ All required secrets are present")
        
    except Exception as e:
        print(f"✗ Error loading secrets: {e}", file=sys.stderr)
        sys.exit(1)
