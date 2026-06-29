#[cfg(feature = "private")]
#[allow(unused)]
pub use crate::ee::*;
#[cfg(all(feature = "enterprise", not(feature = "private")))]
pub use windmill_api_auth::ee_oss::ExternalJwks;

#[cfg(not(feature = "private"))]
use anyhow::anyhow;
#[cfg(not(feature = "private"))]
pub async fn validate_license_key(
    _license_key: String,
    _db: Option<&crate::db::DB>,
) -> anyhow::Result<(
    String,
    bool,
    Option<windmill_common::ee_oss::OfflineMetadata>,
)> {
    // Internal builds do not expose commercial license validation.
    Err(anyhow!("当前内部部署未开放授权校验功能"))
}

// interpolate moved to windmill-store/src/resources.rs
#[cfg(all(
    feature = "enterprise",
    any(feature = "nats", feature = "kafka", feature = "sqs_trigger")
))]
pub use windmill_store::resources::interpolate;
