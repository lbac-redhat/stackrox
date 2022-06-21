import * as api from '../../constants/apiEndpoints';
import withAuth from '../../helpers/basicAuth';
import { hasFeatureFlag } from '../../helpers/features';
import { visitMainDashboardPF } from '../../helpers/main';

import { pfSelectors as selectors } from '../../constants/DashboardPage';

const imageCountQueryRes = {
    data: { timeRange0: 40, timeRange1: 32, timeRange2: 31, timeRange3: 18 },
};

describe('Dashboard security metrics phase one action widgets', () => {
    withAuth();

    before(function beforeHook() {
        if (!hasFeatureFlag('ROX_SECURITY_METRICS_PHASE_ONE')) {
            this.skip();
        }
    });

    it('should sort a policy violations by category widget by severity and volume of violations', () => {
        cy.intercept('GET', api.graphql('agingImageQuery'), {
            body: imageCountQueryRes,
        }).as('getAgingImageCounts');
        visitMainDashboardPF();
        cy.wait('@getAgingImageCounts');
    });
});
