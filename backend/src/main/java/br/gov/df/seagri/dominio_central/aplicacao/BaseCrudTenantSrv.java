package br.gov.df.seagri.dominio_central.aplicacao;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;

import br.gov.df.seagri.dominio_central.dominio.EntidadeBase;
import br.gov.df.seagri.dominio_central.dominio.PertenceOrganizacao;
import br.gov.df.seagri.dominio_central.infraestrutura.BaseDAO;
import lombok.NonNull;

public abstract class BaseCrudTenantSrv<T extends EntidadeBase<ID> & PertenceOrganizacao, ID extends Serializable>
        implements CrudTenantSrv<T, ID> {

    protected final BaseDAO<T, ID> dao;
    protected final ValidadorTenant validadorTenant;

    public BaseCrudTenantSrv(BaseDAO<T, ID> dao, ValidadorTenant validadorTenant) {
        this.dao = dao;
        this.validadorTenant = validadorTenant;
    }

    protected Specification<T> filtroTenant(UUID organizacaoId) {
        return (root, query, cb) -> cb.equal(root.get("organizacao").get("id"), organizacaoId);
    }

    @Override
    @Transactional
    public T salvar(UUID organizacaoId, T entidade) {
        if (entidade == null) {
            throw new IllegalArgumentException("Entidade não pode ser nula");
        }
        validadorTenant.validarPertencimento(entidade, organizacaoId);
        return dao.save(entidade);
    }

    @Override
    public T buscarPorId(@NonNull UUID organizacaoId, @NonNull ID id) {
        T entidade = dao.findById(id).orElseThrow(() -> new IllegalArgumentException("Registro não encontrado: " + id));
        validadorTenant.validarPertencimento(entidade, organizacaoId);
        return entidade;
    }

    @Override
    @Transactional
    public void excluir(UUID organizacaoId, ID id) {
        T entidade = buscarPorId(organizacaoId, id);
        if (entidade == null) {
            throw new IllegalArgumentException("Registro não encontrado: " + id);
        }
        dao.delete(entidade);
    }

    @Override
    public List<T> buscarTudo(UUID organizacaoId) {
        return dao.findAll(filtroTenant(organizacaoId));
    }

    @Override
    public Page<T> buscarTudo(UUID organizacaoId, Pageable pageable) {
        if (pageable == null) {
            throw new IllegalArgumentException("Faltou informar a paginação");
        }
        return dao.findAll(filtroTenant(organizacaoId), pageable);
    }

    @Override
    public List<T> buscarTudoComFiltro(UUID organizacaoId, Specification<T> filtro) {
        return dao.findAll(filtroTenant(organizacaoId).and(filtro));
    }

    @Override
    public Page<T> buscarTudoComFiltro(UUID organizacaoId, Specification<T> filtro, Pageable pageable) {
        if (pageable == null) {
            throw new IllegalArgumentException("Faltou informar a paginação");
        }
        return dao.findAll(filtroTenant(organizacaoId).and(filtro), pageable);
    }
}
