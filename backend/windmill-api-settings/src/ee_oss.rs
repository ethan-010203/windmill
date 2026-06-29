#[cfg(feature = "private")]
#[allow(unused)]
pub use crate::ee::*;

#[cfg(not(feature = "private"))]
use anyhow::anyhow;
#[cfg(not(feature = "private"))]
pub async fn validate_license_key(
    _license_key: String,
    _db: Option<&windmill_common::DB>,
) -> anyhow::Result<(
    String,
    bool,
    Option<windmill_common::ee_oss::OfflineMetadata>,
)> {
    // Internal builds do not expose commercial license validation.
    Err(anyhow!("当前内部部署未开放授权校验功能"))
}
