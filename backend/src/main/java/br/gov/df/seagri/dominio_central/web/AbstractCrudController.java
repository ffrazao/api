package br.gov.df.seagri.dominio_central.web;

import br.gov.df.seagri.dominio_central.aplicacao.BaseCrudSrv;
import br.gov.df.seagri.dominio_central.dominio.EntidadeBase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.io.Serializable;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller genérico para operações CRUD em contexto Global (sem Tenant).
 * Utiliza MapStruct para conversão automática.
 */
// Adicionamos o "extends EntidadeBase" logo após o T
public abstract class AbstractCrudController<T extends EntidadeBase<ID>, REQ, RES, ID extends Serializable> extends AbstractApiController {

    protected final BaseCrudSrv<T, ID> servico;
    protected final BaseMapper<T, REQ, RES> mapper;

    protected AbstractCrudController(BaseCrudSrv<T, ID> servico, BaseMapper<T, REQ, RES> mapper) {
        this.servico = servico;
        this.mapper = mapper;
    }

    // Método para injetar a auditoria de quem criou
    protected abstract void vincularContexto(T entidade);

    @PostMapping
    public ResponseEntity<ApiResponse<RES>> criar(@Valid @RequestBody REQ request) {
        T novaEntidade = mapper.paraEntidade(request);
        vincularContexto(novaEntidade);
        T salva = servico.salvar(novaEntidade);
        return created(mapper.paraDto(salva));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RES>> atualizar(@PathVariable ID id, @Valid @RequestBody REQ request) {
        T entidadeExistente = servico.buscarPorId(id);
        mapper.atualizarEntidade(entidadeExistente, request);
        vincularContexto(entidadeExistente);
        T atualizada = servico.salvar(entidadeExistente);
        return ok(mapper.paraDto(atualizada));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RES>> buscarPorId(@PathVariable ID id) {
        return ok(mapper.paraDto(servico.buscarPorId(id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RES>>> listar() {
        return ok(servico.buscarTudo().stream()
                .map(mapper::paraDto)
                .collect(Collectors.toList()));
    }

    @GetMapping("/lookup")
    public ResponseEntity<ApiResponse<List<RES>>> lookup() {
        return ok(servico.buscarTudo().stream()
                .map(mapper::paraDto)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> excluir(@PathVariable ID id) {
        servico.excluir(id);
        return ok(null);
    }
}
