create extension if not exists dblink;

insert
	into
	folha_ponto.organizacao
(id,
	nome,
	status,
	criado_por,
	criado_em,
	atualizado_por,
	atualizado_em)
select
	'11111111-1111-1111-1111-111111111111'::uuid,
	'SEAGRI',
	'ATIVO',
	id::uuid,
	now(),
	id::uuid,
	now()
from
	dblink(
    'dbname=keycloak host=localhost port=5432 user=keycloak password=uQ5&hS2^dX8tVw1J',
    'SELECT id AS id FROM public.user_entity WHERE username = ''abc'''
) as dblink(id varchar);

insert
	into
	folha_ponto.unidade (
    id,
	organizacao_id,
	nome,
	criado_por,
	criado_em,
	atualizado_por,
	atualizado_em,
	tipo_geometria,
	centro_geo_lat,
	centro_geo_lng,
	raio_geo_metros,
	poligono_geo
)
select
	1,
	'11111111-1111-1111-1111-111111111111'::uuid,
	'DILOG',
	id::uuid,
	now(),
	id::uuid,
	now(),
	'RAIO',
	-15.7336157,
	-47.906275,
	150,
	null::jsonb
from
	dblink(
    'dbname=keycloak host=localhost port=5432 user=keycloak password=uQ5&hS2^dX8tVw1J',
    'SELECT id FROM public.user_entity WHERE username = ''abc'''
) as dblink(id uuid)
union all

select
	2,
	'11111111-1111-1111-1111-111111111111'::uuid,
	'GETI',
	id::uuid,
	now(),
	id::uuid,
	now(),
	'RAIO',
	-15.7336157,
	-47.906275,
	150,
	null::jsonb
from
	dblink(
    'dbname=keycloak host=localhost port=5432 user=keycloak password=uQ5&hS2^dX8tVw1J',
    'SELECT id FROM public.user_entity WHERE username = ''abc'''
) as dblink(id uuid);

insert
	into
	folha_ponto.convite
(organizacao_id,
	unidade_id,
	papel_esperado,
	codigo,
	data_expiracao,
	usado,
	criado_por,
	criado_em,
	atualizado_por,
	atualizado_em)
select
	'11111111-1111-1111-1111-111111111111'::uuid,
	1,
	'PARTICIPANTE',
	'CONV01',
	(now() + interval '10 days')::timestamp,
	false,
	id::uuid,
	now(),
	id::uuid,
	now()
from
	dblink(
    'dbname=keycloak host=localhost port=5432 user=keycloak password=uQ5&hS2^dX8tVw1J',
    'SELECT id FROM public.user_entity WHERE username = ''abc'''
) as dblink(id uuid)
union all

select
	'11111111-1111-1111-1111-111111111111'::uuid,
	2,
	'PARTICIPANTE',
	'CONV02',
	(now() + interval '10 days')::timestamp,
	false,
	id::uuid,
	now(),
	id::uuid,
	now()
from
	dblink(
    'dbname=keycloak host=localhost port=5432 user=keycloak password=uQ5&hS2^dX8tVw1J',
    'SELECT id FROM public.user_entity WHERE username = ''abc'''
) as dblink(id uuid);
