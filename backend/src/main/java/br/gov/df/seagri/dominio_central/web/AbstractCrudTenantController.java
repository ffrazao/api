package br.gov.df.seagri.dominio_central.web;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import br.gov.df.seagri.dominio_central.aplicacao.CrudTenantSrv;
import br.gov.df.seagri.dominio_central.dominio.EntidadeBase;
import jakarta.validation.Valid;

public abstract class AbstractCrudTenantController<T extends EntidadeBase<ID>, REQ, RES, ID extends Serializable> extends AbstractApiController {

    // A sua sugestão aplicada perfeitamente: o estado reside no pai!
    protected final CrudTenantSrv<T, ID> servico;
    protected final BaseMapper<T, REQ, RES> mapper;

    protected AbstractCrudTenantController(CrudTenantSrv<T, ID> servico, BaseMapper<T, REQ, RES> mapper) {
        this.servico = servico;
        this.mapper = mapper;
    }

    // Único método que a classe filha precisa implementar para injetar o contexto (Tenant/Auditoria)
    protected abstract void vincularContexto(T entidade, UUID organizacaoId);

    @PostMapping
    public ResponseEntity<ApiResponse<RES>> criar(@PathVariable UUID organizacaoId, @Valid @RequestBody REQ request) {
        T novaEntidade = mapper.paraEntidade(request);
        vincularContexto(novaEntidade, organizacaoId); // Injeta Tenant e Usuário

        T salva = servico.salvar(organizacaoId, novaEntidade);
        return created(mapper.paraDto(salva));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RES>> atualizar(@PathVariable UUID organizacaoId, @PathVariable ID id, @Valid @RequestBody REQ request) {
        T entidadeExistente = servico.buscarPorId(organizacaoId, id);
        mapper.atualizarEntidade(entidadeExistente, request);
        vincularContexto(entidadeExistente, organizacaoId); // Garante que não quebre a integridade

        T atualizada = servico.salvar(organizacaoId, entidadeExistente);
        return ok(mapper.paraDto(atualizada));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RES>> buscarPorId(@PathVariable UUID organizacaoId, @PathVariable ID id) {
        return ok(mapper.paraDto(servico.buscarPorId(organizacaoId, id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RES>>> listar(@PathVariable UUID organizacaoId) {
        return ok(servico.buscarTudo(organizacaoId).stream()
                .map(mapper::paraDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/lookup")
    public ResponseEntity<ApiResponse<List<RES>>> lookup(@PathVariable UUID organizacaoId) {
        return ok(servico.buscarTudo(organizacaoId).stream()
                .map(mapper::paraDto)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> excluir(@PathVariable UUID organizacaoId, @PathVariable ID id) {
        servico.excluir(organizacaoId, id);
        return ok(null);
    }
}
