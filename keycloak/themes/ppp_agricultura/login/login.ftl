<#import "template.ftl" as layout>

<@layout.registrationLayout displayMessage=true; section>

    <#if section = "header">
        <div class="seagri-header">
            <img src="${url.resourcesPath}/img/logo-seagri.svg" class="logo" />
            <h2>${realm.displayName!realm.name}</h2>
        </div>
    </#if>

    <#if section = "form">
        <div class="seagri-bg"></div>
        <div class="seagri-login-card">

            <form id="kc-form-login" action="${url.loginAction}" method="post">

                <div class="form-group">
                    <label for="username">${msg("username")}</label>
                    <input type="text" id="username" name="username"
                           value="${(login.username!'')}"
                           autofocus autocomplete="username" />
                </div>

                <div class="form-group">
                    <label for="password">${msg("password")}</label>
                    <input type="password" id="password" name="password"
                           autocomplete="current-password" />
                </div>

                <#if realm.rememberMe && !usernameEditDisabled??>
                    <div class="remember-me">
                        <input type="checkbox" id="rememberMe" name="rememberMe"
                               <#if login.rememberMe??>checked</#if> />
                        <label for="rememberMe">${msg("rememberMe")}</label>
                    </div>
                </#if>

                <div class="form-actions">
                    <button type="submit">${msg("doLogIn")}</button>
                </div>

                <div class="extra-links">
                    <#if realm.resetPasswordAllowed>
                        <a href="${url.loginResetCredentialsUrl}">
                            ${msg("doForgotPassword")}
                        </a>
                    </#if>

                    <#if realm.registrationAllowed>
                        <a href="${url.registrationUrl}">
                            ${msg("doRegister")}
                        </a>
                    </#if>
                </div>

            </form>

            <#-- LOGIN SOCIAL -->
            <#if social?? && social.providers?has_content>
                <div class="social-login">
                    <p>${msg("identity-provider-login-label")}</p>

                    <#list social.providers as p>
                        <a class="social-btn" href="${p.loginUrl}">
                            ${p.displayName}
                        </a>
                    </#list>
                </div>
            </#if>

        </div>
    </#if>

</@layout.registrationLayout>