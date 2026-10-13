import {test,expect} from '@playwright/test';
test('provides keyboard chart values, raw tables and dark layouts without overflow',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Progress',exact:true}).click();
 const chart=page.getByRole('img',{name:'Strength repetitions · reps chart'});await chart.getByRole('button').first().focus();await expect(page.locator('.chart-caption').first()).toContainText('reps');await page.getByRole('button',{name:'Strength repetitions data',exact:true}).click();await expect(page.getByRole('table',{name:'Strength repetitions data'})).toContainText('Unknown');
 await page.getByLabel('Recovery chart range').selectOption('84');await page.getByRole('button',{name:'CMJ height data',exact:true}).click();await expect(page.getByRole('table',{name:'CMJ height data'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'/tmp/pet-progress-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/pet-progress-desktop.png',fullPage:true});
});
