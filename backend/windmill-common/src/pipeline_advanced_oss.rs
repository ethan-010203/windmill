//! OSS fallback: pipeline freshness/SLA enforcement and partition backfills
//! are enterprise features; their implementations live in windmill-ee-private
//! (see `pipeline_advanced_ee`). In the public build the entry points report
//! that the enterprise edition is required.

use crate::error::Error;

pub fn freshness_enforcement_todo() -> Error {
    Error::internal_err(
        "当前内部部署未开放管道新鲜度和 SLA 检查功能".to_string(),
    )
}

pub fn backfill_todo() -> Error {
    Error::internal_err("当前内部部署未开放管道分区回填功能".to_string())
}
