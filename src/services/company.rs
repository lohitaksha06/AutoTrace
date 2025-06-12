use sqlx::SqlitePool;
use crate::models::Company;
use uuid::Uuid;

pub async fn insert_company(pool: &SqlitePool, company: &Company) -> Result<Company, sqlx::Error> {
    let id = Uuid::new_v4().to_string();

    sqlx::query!(
        "INSERT INTO companies (id, name, location, license_id, stock_needed) VALUES (?, ?, ?, ?, ?)",
        id,
        company.name,
        company.location,
        company.license_id,
        company.stock_needed,
    )
    .execute(pool)
    .await?;

    Ok(Company {
        id,
        name: company.name.clone(),
        location: company.location.clone(),
        license_id: company.license_id.clone(),
        stock_needed: company.stock_needed.clone(),
    })
}
