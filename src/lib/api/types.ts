import type { components, paths } from './schema';

type Schemas = components['schemas'];

export type Permission = Schemas['Permission'];
export type UserRole = Schemas['UserRole'];
export type UserStatus = Schemas['UserStatus'];
export type CurrentSession = Schemas['CurrentSessionDto'];
export type SessionUser = Schemas['SessionUserDto'];
export type SessionOrganization = Schemas['SessionOrganizationDto'];

export type User = Schemas['UserDto'];
export type CreateUserInput = Schemas['CreateUserDto'];
export type UpdateUserInput = Schemas['UpdateUserDto'];
export type UpdateProfileInput = Schemas['UpdateProfileDto'];
export type ChangePasswordInput = Schemas['ChangePasswordDto'];

export type Location = Schemas['LocationDto'];
export type CreateLocationInput = Schemas['CreateLocationDto'];
export type UpdateLocationInput = Schemas['UpdateLocationDto'];

export type Organization = Schemas['OrganizationDto'];
export type UpdateOrganizationInput = Schemas['UpdateOrganizationDto'];

export type AuditLog = Schemas['AuditLogDto'];

export type Category = Schemas['CategoryDto'];
export type CreateCategoryInput = Schemas['CreateCategoryDto'];
export type UpdateCategoryInput = Schemas['UpdateCategoryDto'];
export type Brand = Schemas['BrandDto'];
export type CreateBrandInput = Schemas['CreateBrandDto'];
export type UpdateBrandInput = Schemas['UpdateBrandDto'];
export type Product = Schemas['ProductDto'];
export type CreateProductInput = Schemas['CreateProductDto'];
export type UpdateProductInput = Schemas['UpdateProductDto'];
export type ProductFacets = Schemas['ProductFacetsDto'];

export type StockLevel = Schemas['StockLevelDto'];
export type KardexEntry = Schemas['KardexEntryDto'];

export type Movement = Schemas['MovementDto'];
export type MovementSummary = Schemas['MovementSummaryDto'];
export type MovementItem = Schemas['MovementItemDto'];
export type MovementType = Schemas['MovementType'];
export type MovementStatus = Schemas['MovementStatus'];
export type MovementUnit = Schemas['MovementUnit'];
export type MovementLineInput = Schemas['MovementLineInputDto'];
export type CreateMovementInput = Schemas['CreateMovementDto'];
export type UpdateMovementInput = Schemas['UpdateMovementDto'];

export type ConsumptionReport = Schemas['ConsumptionReportDto'];
export type ConsumptionRow = Schemas['ConsumptionRowDto'];
export type SummaryReport = Schemas['SummaryReportDto'];
export type ActivityReport = Schemas['ActivityReportDto'];
export type ActivityRow = Schemas['ActivityRowDto'];

export type PageMeta = Schemas['PageMetaDto'];

/** Query shapes come from the operation, so a renamed param breaks the build. */
export type ProductListQuery = NonNullable<paths['/api/v1/products']['get']['parameters']['query']>;
export type MovementListQuery = NonNullable<
  paths['/api/v1/movements']['get']['parameters']['query']
>;
export type ConsumptionQuery = NonNullable<
  paths['/api/v1/reports/consumption']['get']['parameters']['query']
>;
export type ConsumptionGroupBy = NonNullable<ConsumptionQuery['groupBy']>;
export type AuditLogListQuery = NonNullable<
  paths['/api/v1/audit-logs']['get']['parameters']['query']
>;
