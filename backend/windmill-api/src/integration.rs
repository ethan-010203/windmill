use crate::db::DB;
use axum::{extract::Query, response::IntoResponse, routing::get, Extension, Router};
use windmill_common::{error::Error, INTERNAL_HUB_DISABLED_MESSAGE};

pub fn global_service() -> Router {
    Router::new().route("/hub/list", get(list_hub_integrations))
}

#[derive(serde::Deserialize)]
struct ListHubIntegrationsQuery {
    kind: Option<String>,
}
async fn list_hub_integrations(
    Query(query): Query<ListHubIntegrationsQuery>,
    Extension(db): Extension<DB>,
) -> impl IntoResponse {
    let _ = (query.kind, db);
    Err::<axum::response::Response, Error>(Error::BadRequest(
        INTERNAL_HUB_DISABLED_MESSAGE.to_string(),
    ))
}
