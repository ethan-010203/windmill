/*
 * Author: Windmill Labs, Inc
 * Copyright (C) Windmill Labs, Inc - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

use async_trait::async_trait;

use crate::db::DB;
use crate::error::{Error, Result};

use super::{AwsSecretsManagerSettings, SecretBackend, SecretMigrationReport};

pub struct AwsSecretsManagerBackend;

impl AwsSecretsManagerBackend {
    pub fn new(_settings: AwsSecretsManagerSettings) -> Self {
        AwsSecretsManagerBackend
    }
}

#[async_trait]
impl SecretBackend for AwsSecretsManagerBackend {
    async fn get_secret(&self, _workspace_id: &str, _path: &str) -> Result<String> {
        Err(Error::internal_err(
            "当前内部部署未开放 AWS Secrets Manager 集成功能".to_string(),
        ))
    }

    async fn set_secret(&self, _workspace_id: &str, _path: &str, _value: &str) -> Result<()> {
        Err(Error::internal_err(
            "当前内部部署未开放 AWS Secrets Manager 集成功能".to_string(),
        ))
    }

    async fn delete_secret(&self, _workspace_id: &str, _path: &str) -> Result<()> {
        Err(Error::internal_err(
            "当前内部部署未开放 AWS Secrets Manager 集成功能".to_string(),
        ))
    }

    fn backend_name(&self) -> &'static str {
        "aws_secrets_manager"
    }
}

pub async fn test_aws_sm_connection(_settings: &AwsSecretsManagerSettings) -> Result<()> {
    Err(Error::internal_err(
        "当前内部部署未开放 AWS Secrets Manager 集成功能".to_string(),
    ))
}

pub async fn migrate_secrets_to_aws_sm(
    _db: &DB,
    _settings: &AwsSecretsManagerSettings,
) -> Result<SecretMigrationReport> {
    Err(Error::internal_err(
        "当前内部部署未开放 AWS Secrets Manager 集成功能".to_string(),
    ))
}

pub async fn migrate_secrets_from_aws_sm(
    _db: &DB,
    _settings: &AwsSecretsManagerSettings,
) -> Result<SecretMigrationReport> {
    Err(Error::internal_err(
        "当前内部部署未开放 AWS Secrets Manager 集成功能".to_string(),
    ))
}
